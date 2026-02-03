/**
 * Aggregated pet profile response with medical timeline
 */
export interface PetProfileResponseDto {
  pet: {
    id: string;
    name: string;
    type: string;
    breed: string;
    gender: string;
    birthDate: Date;
    age: number;
    weight: number;
    microchipId?: string;
    imageUrl?: string;
    ownerId: string;
    ownerName: string;
  };

  healthSummary: {
    lastCheckup?: Date;
    nextCheckup?: Date;
    vaccinations: {
      upToDate: boolean;
      total: number;
      overdue: number;
      upcoming: Array<{
        name: string;
        dueDate: Date;
        status: 'due' | 'overdue' | 'scheduled';
      }>;
    };
    chronicConditions: string[];
    allergies: string[];
    currentMedications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      startDate: Date;
      endDate?: Date;
    }>;
  };

  medicalTimeline: Array<{
    id: string;
    type: 'visit' | 'vaccination' | 'surgery' | 'medication' | 'test' | 'diagnosis';
    date: Date;
    title: string;
    description: string;
    hospitalName?: string;
    veterinarianName?: string;
    documents?: Array<{
      id: string;
      name: string;
      type: string;
      url: string;
    }>;
    cost?: number;
    notes?: string;
  }>;

  upcomingAppointments: Array<{
    id: string;
    hospitalName: string;
    hospitalAddress: string;
    appointmentDate: Date;
    serviceName: string;
    veterinarianName?: string;
    status: string;
    notes?: string;
  }>;

  insuranceInfo?: {
    providerId: string;
    providerName: string;
    policyNumber: string;
    planName: string;
    coverageAmount: number;
    deductible: number;
    deductibleMet: number;
    expiryDate: Date;
    claimsSummary: {
      total: number;
      approved: number;
      pending: number;
      denied: number;
      totalClaimedAmount: number;
      totalApprovedAmount: number;
    };
  };

  statistics: {
    totalVisits: number;
    totalVaccinations: number;
    totalSpent: number;
    mostVisitedHospital?: {
      id: string;
      name: string;
      visitCount: number;
    };
    healthScore: number; // 0-100 based on checkups, vaccinations, etc.
  };
}
