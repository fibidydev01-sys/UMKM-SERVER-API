import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

const COOKIE_NAME = 'fibidy_auth';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    const cookieToken = request.cookies?.[COOKIE_NAME];
    const headerToken = request.headers.authorization?.replace('Bearer ', '');

    if (!cookieToken && !headerToken) {
      throw new UnauthorizedException('Token tidak ditemukan');
    }

    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequest<TUser = any>(err: any, user: TUser, _info: any): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Autentikasi gagal');
    }
    return user;
  }
}
