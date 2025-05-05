import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ParkCarDto {
  @IsString()
  @IsNotEmpty()
  // Basic validation for common registration number formats (adapt if needed)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Registration number should contain only uppercase letters, numbers, and hyphens.',
  })
  registrationNumber: string;

  @IsString()
  @IsNotEmpty()
  color: string;
}