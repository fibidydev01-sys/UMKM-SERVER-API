import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Auth Guard
 * Sama seperti JwtAuthGuard tapi TIDAK throw error kalau tidak ada token.
 * Berguna untuk endpoint public yang ingin tahu siapa user yang login (opsional).
 * request.user akan terisi kalau ada token valid, null kalau tidak ada.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    const cookieToken = request.cookies?.['fibidy_auth'];
    const headerToken = request.headers.authorization?.replace('Bearer ', '');

    // Kalau tidak ada token, skip auth tapi tetap lanjut (user = null)
    if (!cookieToken && !headerToken) {
      return true;
    }

    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequest<TUser = any>(err: any, user: TUser, _info: any): TUser {
    // Kalau gagal auth, jangan throw - biarkan user = null
    if (err || !user) {
      return null as TUser;
    }
    return user;
  }
}
