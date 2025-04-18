import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LeaveRequest,
  LeaveRequestStatus,
  LeaveRequestType,
} from './schemas/leave-request.schema';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { QueryLeaveRequestsDto } from './dto/query-leave-requests.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';
import { DepartmentsService } from '../departments/departments.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class LeaveRequestsService {
  constructor(
    @InjectModel(LeaveRequest.name)
    private leaveRequestModel: Model<LeaveRequest>,
    private departmentsService: DepartmentsService,
    private usersService: UsersService,
  ) {}

  /**
   * Create a new leave request
   */
  async create(
    userId: string,
    createLeaveRequestDto: CreateLeaveRequestDto,
  ): Promise<LeaveRequest> {
    // Validate date range
    if (
      new Date(createLeaveRequestDto.startDate) >
      new Date(createLeaveRequestDto.endDate)
    ) {
      throw new BadRequestException(
        'Start date must be before or equal to end date',
      );
    }

    // Check if user belongs to the specified department
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    // Check if the department exists
    const department = await this.departmentsService.findOne(
      createLeaveRequestDto.departmentId,
    );
    if (!department) {
      throw new NotFoundException(`Department not found`);
    }

    // Check if user belongs to the department
    const userDepartments =
      await this.departmentsService.getDepartmentsByMember(userId);
    if (
      !userDepartments.some(
        (dept) => dept.guid === createLeaveRequestDto.departmentId,
      )
    ) {
      throw new BadRequestException(
        `User does not belong to the specified department`,
      );
    }

    // Create new leave request
    const leaveRequest = new this.leaveRequestModel({
      ...createLeaveRequestDto,
      userId,
      status: LeaveRequestStatus.PENDING,
    });

    return leaveRequest.save();
  }

  /**
   * Find all leave requests based on query parameters
   */
  async findAll(queryDto: QueryLeaveRequestsDto): Promise<LeaveRequest[]> {
    const query: any = {};

    // Apply query filters
    if (queryDto.userId) {
      query.userId = queryDto.userId;
    }

    if (queryDto.departmentId) {
      query.departmentId = queryDto.departmentId;
    }

    if (queryDto.type && queryDto.type.length > 0) {
      query.type = { $in: queryDto.type };
    }

    if (queryDto.status && queryDto.status.length > 0) {
      query.status = { $in: queryDto.status };
    }

    // Date range filters
    if (queryDto.startDateFrom || queryDto.startDateTo) {
      query.startDate = {};
      if (queryDto.startDateFrom) {
        query.startDate.$gte = new Date(queryDto.startDateFrom);
      }
      if (queryDto.startDateTo) {
        query.startDate.$lte = new Date(queryDto.startDateTo);
      }
    }

    if (queryDto.endDateFrom || queryDto.endDateTo) {
      query.endDate = {};
      if (queryDto.endDateFrom) {
        query.endDate.$gte = new Date(queryDto.endDateFrom);
      }
      if (queryDto.endDateTo) {
        query.endDate.$lte = new Date(queryDto.endDateTo);
      }
    }

    if (queryDto.reviewedDateFrom || queryDto.reviewedDateTo) {
      query.reviewedAt = {};
      if (queryDto.reviewedDateFrom) {
        query.reviewedAt.$gte = new Date(queryDto.reviewedDateFrom);
      }
      if (queryDto.reviewedDateTo) {
        query.reviewedAt.$lte = new Date(queryDto.reviewedDateTo);
      }
    }

    return this.leaveRequestModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find all leave requests for a specific user
   */
  async findByUserId(userId: string): Promise<LeaveRequest[]> {
    return this.leaveRequestModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find all pending leave requests for a department
   */
  async findPendingByDepartment(departmentId: string): Promise<LeaveRequest[]> {
    return this.leaveRequestModel
      .find({
        departmentId,
        status: LeaveRequestStatus.PENDING,
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  /**
   * Find a specific leave request by GUID
   */
  async findOne(guid: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestModel.findOne({ guid }).exec();
    if (!leaveRequest) {
      throw new NotFoundException(
        `Leave request with GUID "${guid}" not found`,
      );
    }
    return leaveRequest;
  }

  /**
   * Update a leave request
   * Only the owner of the request can update it and only if it's in PENDING status
   */
  async update(
    guid: string,
    userId: string,
    updateLeaveRequestDto: UpdateLeaveRequestDto,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.findOne(guid);

    // Check if the request belongs to the user
    if (leaveRequest.userId !== userId) {
      throw new BadRequestException(
        'You can only update your own leave requests',
      );
    }

    // Check if the request is in PENDING status
    if (leaveRequest.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending leave requests can be updated',
      );
    }

    // Validate start and end dates if they are provided
    if (updateLeaveRequestDto.startDate && updateLeaveRequestDto.endDate) {
      if (
        new Date(updateLeaveRequestDto.startDate) >
        new Date(updateLeaveRequestDto.endDate)
      ) {
        throw new BadRequestException(
          'Start date must be before or equal to end date',
        );
      }
    } else if (
      updateLeaveRequestDto.startDate &&
      !updateLeaveRequestDto.endDate
    ) {
      if (
        new Date(updateLeaveRequestDto.startDate) >
        new Date(leaveRequest.endDate)
      ) {
        throw new BadRequestException(
          'Start date must be before or equal to existing end date',
        );
      }
    } else if (
      !updateLeaveRequestDto.startDate &&
      updateLeaveRequestDto.endDate
    ) {
      if (
        new Date(leaveRequest.startDate) >
        new Date(updateLeaveRequestDto.endDate)
      ) {
        throw new BadRequestException(
          'Existing start date must be before or equal to end date',
        );
      }
    }

    // Update and return the leave request
    const updatedLeaveRequest = await this.leaveRequestModel
      .findOneAndUpdate(
        { guid },
        { $set: updateLeaveRequestDto },
        { new: true },
      )
      .exec();

    if (!updatedLeaveRequest) {
      throw new NotFoundException(`Leave request with GUID "${guid}" not found`);
    }

    return updatedLeaveRequest;
  }

  /**
   * Delete a leave request
   * Only the owner of the request can delete it and only if it's in PENDING status
   */
  async remove(guid: string, userId: string): Promise<LeaveRequest> {
    const leaveRequest = await this.findOne(guid);

    // Check if the request belongs to the user
    if (leaveRequest.userId !== userId) {
      throw new BadRequestException(
        'You can only delete your own leave requests',
      );
    }

    // Check if the request is in PENDING status
    if (leaveRequest.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending leave requests can be deleted',
      );
    }

    const deletedLeaveRequest = await this.leaveRequestModel.findOneAndDelete({ guid }).exec();
    if (!deletedLeaveRequest) {
      throw new NotFoundException(`Leave request with GUID "${guid}" not found`);
    }
    return deletedLeaveRequest;
  }

  /**
   * Review a leave request (approve or reject)
   * Only department heads or admins can review requests
   */
  async reviewRequest(
    guid: string,
    reviewerId: string,
    reviewDto: ReviewLeaveRequestDto,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.findOne(guid);

    // Check if the request is already reviewed
    if (leaveRequest.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        'This leave request has already been reviewed',
      );
    }

    // Update the leave request with review details
    const updatedLeaveRequest = await this.leaveRequestModel
      .findOneAndUpdate(
        { guid },
        {
          $set: {
            status: reviewDto.status,
            reviewedById: reviewerId,
            reviewedAt: new Date(),
            comments: reviewDto.comments || '',
          },
        },
        { new: true },
      )
      .exec();

    if (!updatedLeaveRequest) {
      throw new NotFoundException(`Leave request with GUID "${guid}" not found`);
    }

    return updatedLeaveRequest;
  }

  /**
   * Check if a user has an approved leave/WFH/WFA/DL for a specific date
   */
  async checkUserLeaveStatus(
    userId: string,
    date: Date,
  ): Promise<{ isOnLeave: boolean; leaveType: LeaveRequestType | null }> {
    // Format date to ignore time component
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Find approved leave requests that cover the specified date
    const leaveRequest = await this.leaveRequestModel
      .findOne({
        userId,
        status: LeaveRequestStatus.APPROVED,
        startDate: { $lte: checkDate },
        endDate: { $gte: checkDate },
      })
      .exec();

    return {
      isOnLeave: !!leaveRequest,
      leaveType: leaveRequest ? leaveRequest.type : null,
    };
  }

  /**
   * Get active leave requests for a specific period (for all users in a department)
   */
  async getActiveLeaveRequestsForDepartment(
    departmentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LeaveRequest[]> {
    return this.leaveRequestModel
      .find({
        departmentId,
        status: LeaveRequestStatus.APPROVED,
        $or: [
          { startDate: { $lte: endDate, $gte: startDate } },
          { endDate: { $lte: endDate, $gte: startDate } },
          { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
        ],
      })
      .exec();
  }
}
