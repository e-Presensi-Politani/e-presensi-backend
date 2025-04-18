// departments/departments.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department, DepartmentDocument } from './schemas/department.schema';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AssignHeadDto } from './dto/assign-head.dto';
import { AddMembersDto } from './dto/add-members.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name)
    private departmentModel: Model<DepartmentDocument>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    // Check if department with same code or name already exists
    const existingDepartment = await this.departmentModel.findOne({
      $or: [
        { name: createDepartmentDto.name },
        { code: createDepartmentDto.code },
      ],
    });

    if (existingDepartment) {
      throw new ConflictException(
        'Department with this name or code already exists',
      );
    }

    const createdDepartment = new this.departmentModel(createDepartmentDto);
    return createdDepartment.save();
  }

  async findAll(): Promise<Department[]> {
    return this.departmentModel.find({ isActive: true }).exec();
  }

  async findAllWithInactive(): Promise<Department[]> {
    return this.departmentModel.find().exec();
  }

  async findOne(guid: string): Promise<Department> {
    const department = await this.departmentModel.findOne({ guid }).exec();
    if (!department) {
      throw new NotFoundException(`Department with GUID ${guid} not found`);
    }
    return department;
  }

  async findByCode(code: string): Promise<Department> {
    const department = await this.departmentModel.findOne({ code }).exec();
    if (!department) {
      throw new NotFoundException(`Department with code ${code} not found`);
    }
    return department;
  }

  async update(
    guid: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<Department> {
    const department = await this.departmentModel
      .findOneAndUpdate({ guid }, updateDepartmentDto, { new: true })
      .exec();

    if (!department) {
      throw new NotFoundException(`Department with GUID ${guid} not found`);
    }
    return department;
  }

  async remove(guid: string): Promise<Department> {
    // Soft delete by setting isActive to false
    const department = await this.departmentModel
      .findOneAndUpdate({ guid }, { isActive: false }, { new: true })
      .exec();

    if (!department) {
      throw new NotFoundException(`Department with GUID ${guid} not found`);
    }
    return department;
  }

  async hardRemove(guid: string): Promise<Department> {
    const department = await this.departmentModel
      .findOneAndDelete({ guid })
      .exec();
    if (!department) {
      throw new NotFoundException(`Department with GUID ${guid} not found`);
    }
    return department;
  }

  async assignHead(
    guid: string,
    assignHeadDto: AssignHeadDto,
  ): Promise<Department> {
    const department = await this.departmentModel
      .findOneAndUpdate(
        { guid },
        { headId: assignHeadDto.userId },
        { new: true },
      )
      .exec();

    if (!department) {
      throw new NotFoundException(`Department with GUID ${guid} not found`);
    }
    return department;
  }

  async addMembers(
    guid: string,
    addMembersDto: AddMembersDto,
  ): Promise<Department> {
    const department = await this.departmentModel.findOne({ guid }).exec();
    if (!department) {
      throw new NotFoundException(`Department with GUID ${guid} not found`);
    }

    // Filter out duplicates
    const uniqueMembers = new Set([
      ...department.memberIds,
      ...addMembersDto.userIds,
    ]);

    const updatedDepartment = await this.departmentModel
      .findOneAndUpdate(
        { guid },
        { memberIds: Array.from(uniqueMembers) },
        { new: true },
      )
      .exec();

    if (!updatedDepartment) {
      throw new NotFoundException(`Department with GUID ${guid} not found`);
    }

    return updatedDepartment;
  }

  async removeMembers(
    guid: string,
    addMembersDto: AddMembersDto,
  ): Promise<Department> {
    const department = await this.departmentModel.findOne({ guid }).exec();
    if (!department) {
      throw new NotFoundException(`Department with GUID ${guid} not found`);
    }

    // Filter out the members to remove
    const updatedMembers = department.memberIds.filter(
      (id) => !addMembersDto.userIds.includes(id),
    );

    const updatedDepartment = await this.departmentModel
      .findOneAndUpdate({ guid }, { memberIds: updatedMembers }, { new: true })
      .exec();

    if (!updatedDepartment) {
      throw new NotFoundException(`Department with GUID ${guid} not found`);
    }

    return updatedDepartment;
  }

  async getDepartmentsByMember(userId: string): Promise<Department[]> {
    return this.departmentModel
      .find({
        $or: [{ headId: userId }, { memberIds: userId }],
        isActive: true,
      })
      .exec();
  }

  async getDepartmentByHead(userId: string): Promise<Department[]> {
    return this.departmentModel
      .find({
        headId: userId,
        isActive: true,
      })
      .exec();
  }
}
