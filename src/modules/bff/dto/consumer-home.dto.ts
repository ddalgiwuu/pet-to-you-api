import { IsOptional, IsNumber, IsString, IsLatitude, IsLongitude } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query parameters for consumer home screen
 */
export class ConsumerHomeQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 5;

  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radius?: number = 10; // km
}

/**
 * Consumer home screen response
 */
export interface ConsumerHomeResponseDto {
  upcomingBookings: {
    total: number;
    bookings: Array<{
      id: string;
      hospitalName: string;
      hospitalAddress: string;
      appointmentDate: Date;
      serviceName: string;
      petName: string;
      petType: string;
      status: string;
      estimatedDuration: number;
    }>;
  };

  petHealthReminders: Array<{
    petId: string;
    petName: string;
    reminderType: 'vaccination' | 'checkup' | 'medication';
    dueDate: Date;
    priority: 'high' | 'medium' | 'low';
    description: string;
  }>;

  nearbyHospitals: Array<{
    id: string;
    name: string;
    address: string;
    distance: number;
    rating: number;
    reviewCount: number;
    specialties: string[];
    nextAvailableSlot?: Date;
    isOpen: boolean;
  }>;

  adoptionRecommendations: Array<{
    id: string;
    name: string;
    type: string;
    breed: string;
    age: number;
    gender: string;
    imageUrl: string;
    shelterName: string;
    matchScore?: number;
  }>;

  insuranceRecommendations?: Array<{
    id: string;
    providerName: string;
    planName: string;
    monthlyPremium: number;
    coverageAmount: number;
    deductible: number;
    matchReason: string;
  }>;

  promotions: Array<{
    id: string;
    title: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    validUntil: Date;
    applicableServices: string[];
  }>;
}
