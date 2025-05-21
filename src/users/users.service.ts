// Add to src/users/users.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConfigService } from '../config/config.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user with email or NIP already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email: createUserDto.email }, { nip: createUserDto.nip }],
    });

    if (existingUser) {
      throw new BadRequestException(
        'User with this email or NIP already exists',
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create a new user with hashed password
    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    return newUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOne(guid: string): Promise<User> {
    const user = await this.userModel.findOne({ guid }).exec();
    if (!user) {
      throw new NotFoundException(`User with guid ${guid} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async findByNip(nip: string): Promise<User> {
    const user = await this.userModel.findOne({ nip }).exec();
    if (!user) {
      throw new NotFoundException(`User with NIP ${nip} not found`);
    }
    return user;
  }

  async update(guid: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(guid);

    // If updating email or nip, check if they already exist for another user
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.userModel.findOne({
        email: updateUserDto.email,
        guid: { $ne: guid },
      });

      if (emailExists) {
        throw new BadRequestException('Email already in use');
      }
    }

    if (updateUserDto.nip && updateUserDto.nip !== user.nip) {
      const nipExists = await this.userModel.findOne({
        nip: updateUserDto.nip,
        guid: { $ne: guid },
      });

      if (nipExists) {
        throw new BadRequestException('NIP already in use');
      }
    }

    // If updating password, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.userModel
      .findOneAndUpdate({ guid }, { $set: updateUserDto }, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with guid ${guid} not found`);
    }

    return updatedUser;
  }

  async remove(guid: string): Promise<void> {
    const result = await this.userModel.deleteOne({ guid }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`User with guid ${guid} not found`);
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async validateUserPassword(
    email: string,
    password: string,
  ): Promise<boolean> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      return false;
    }

    return bcrypt.compare(password, user.password);
  }

  async updatePassword(userId: string, newPassword: string): Promise<User> {
    const user = await this.userModel.findOne({ guid: userId }).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Hash the new password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password
    user.password = hashedPassword;

    // Save the user with the new password
    return user.save();
  }

  // New method to update a user's profile photo
  async updateProfilePhoto(
    userId: string,
    fileGuid: string | null,
  ): Promise<User> {
    const user = await this.userModel.findOne({ guid: userId }).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Update the profileImage field
    user.profileImage = fileGuid;

    // Save the updated user
    return user.save();
  }

  // Get user with profile photo details
  async getUserWithProfilePhoto(userId: string): Promise<User> {
    const user = await this.userModel.findOne({ guid: userId }).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }
}
