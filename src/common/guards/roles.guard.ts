import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { GlobalRole } from '../../../generated/prisma/client'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Bypass if route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }

    // 2. Check for required roles metadata
    const requiredRoles = this.reflector.getAllAndOverride<GlobalRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles || requiredRoles.length === 0) {
      return true // If no role is specified, allow access to any authenticated user
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user as { globalRole: GlobalRole }

    return this.matchRoles(requiredRoles, user.globalRole)
  }

  private matchRoles(requiredRoles: GlobalRole[], userRole: GlobalRole): boolean {
    const roleHierarchy: Record<GlobalRole, number> = {
      [GlobalRole.USER]: 1,
      [GlobalRole.ADMIN]: 2,
      [GlobalRole.SUPER_ADMIN]: 3,
    }

    const userWeight = roleHierarchy[userRole] || 0
    return requiredRoles.some(reqRole => {
      const reqWeight = roleHierarchy[reqRole] || 0
      return userWeight >= reqWeight
    })
  }
}
