// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '../config/config.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.validateUser(email, password);
    
    if (!user) {
      return null;
    }
    
    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    const payload = { 
      sub: user.guid, 
      email: user.email, 
      role: user.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(
        payload, 
        { 
          secret: this.configService.jwtRefreshSecret,
          expiresIn: this.configService.jwtRefreshExpiration,
        }
      ),
      user: {
        guid: user.guid,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    
    const payload = { 
      sub: user.guid, 
      email: user.email, 
      role: user.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(
        payload, 
        { 
          secret: this.configService.jwtRefreshSecret,
          expiresIn: this.configService.jwtRefreshExpiration,
        }
      ),
      user: {
        guid: user.guid,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.jwtRefreshSecret,
      });

      const user = await this.usersService.findOne(payload.sub);
      
      if (!user || !user.isActive) {
        throw new UnauthorizedException();
      }

      const newPayload = { 
        sub: user.guid, 
        email: user.email, 
        role: user.role 
      };

      return {
        access_token: this.jwtService.sign(newPayload),
        refresh_token: this.jwtService.sign(
          newPayload, 
          { 
            secret: this.configService.jwtRefreshSecret,
            expiresIn: this.configService.jwtRefreshExpiration,
          }
        ),
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}