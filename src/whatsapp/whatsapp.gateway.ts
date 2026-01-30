import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';

@UseGuards(ThrottlerGuard)
@WebSocketGateway({
  namespace: '/whatsapp',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class WhatsAppGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WhatsAppGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from cookie or handshake auth
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without auth token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) {
        this.logger.error('JWT_SECRET is not configured in environment');
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });

      // Store user info in socket data
      client.data.user = payload;
      const tenantId = payload.sub; // JWT payload uses 'sub' field for tenant ID

      // Join room based on tenantId
      client.join(tenantId);
      this.logger.log(
        `Client ${client.id} authenticated and joined room: ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Authentication failed for client ${client.id}: ${error.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const tenantId = client.data.user?.sub; // JWT payload uses 'sub' field
    this.logger.log(
      `WhatsApp WebSocket client disconnected: ${client.id} (tenant: ${tenantId})`,
    );
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, payload: { tenantId: string }) {
    const authenticatedTenantId = client.data.user?.sub; // JWT payload uses 'sub' field

    // Verify that the user is trying to join their own room
    if (payload.tenantId !== authenticatedTenantId) {
      this.logger.warn(
        `Client ${client.id} tried to join unauthorized room: ${payload.tenantId}`,
      );
      return;
    }

    client.join(payload.tenantId);
    this.logger.log(`Client ${client.id} joined room: ${payload.tenantId}`);
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractTokenFromSocket(client: Socket): string | null {
    // Try to get token from cookie
    const cookies = client.handshake.headers.cookie;
    if (cookies) {
      const cookieMatch = cookies.match(/fibidy_auth=([^;]+)/);
      if (cookieMatch) {
        return cookieMatch[1];
      }
    }

    // Try to get token from auth header
    const authHeader =
      client.handshake.auth?.token || client.handshake.headers.authorization;
    if (authHeader) {
      return authHeader.replace('Bearer ', '');
    }

    return null;
  }

  /**
   * Emit QR code to client
   */
  emitQrCode(tenantId: string, qrCode: string, expiresIn: number = 60) {
    this.server.to(tenantId).emit('qr-code', {
      qrCode,
      expiresIn,
    });

    this.logger.log(`QR code emitted to tenant: ${tenantId}`);
  }

  /**
   * Emit connection status change
   */
  emitConnectionStatus(
    tenantId: string,
    status: 'connecting' | 'connected' | 'disconnected',
    phoneNumber?: string,
  ) {
    this.server.to(tenantId).emit('connection-status', {
      status,
      phoneNumber,
    });

    this.logger.log(
      `Connection status emitted to tenant ${tenantId}: ${status}`,
    );
  }
}
