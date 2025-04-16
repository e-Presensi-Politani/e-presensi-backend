// src/common/guards/department-head.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { DepartmentsService } from '../../departments/departments.service';
import { UserRole } from '../../users/schemas/user.schema';

@Injectable()
export class DepartmentHeadGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private departmentsService: DepartmentsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Always allow admin access
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Admin has all permissions
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Check if user is a department head
    const departmentId = request.params.departmentId || request.body.departmentId;
    
    if (!departmentId) {
      return false;
    }

    try {
      // Get department to check headId
      const department = await this.departmentsService.findOne(departmentId);
      
      // Allow if user is the head of the department
      if (department.headId === user.guid) {
        return true;
      }
      
      // For specific routes, also check if user is the department head of the user's department
      const targetUserId = request.params.userId || request.body.userId;
      
      if (targetUserId) {
        const userDepartments = await this.departmentsService.getDepartmentsByMember(targetUserId);
        return userDepartments.some(dept => dept.headId === user.guid);
      }
      
      throw new ForbiddenException('You do not have permission to perform this action');
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      return false;
    }
  }
}