export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'landlord' | 'tenant'
export type UnitStatus = 'vacant' | 'occupied'
export type LeaseStatus = 'pending' | 'active' | 'terminated'
export type TransactionType = 'rent' | 'prorated_rent' | 'late_fee' | 'payment' | 'adjustment'
export type PaymentGateway = 'mtn' | 'airtel'
export type PaymentStatus = 'pending' | 'completed' | 'failed'
export type TenantStatus = 'active' | 'archived'

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          name: string
          address: string
          landlord_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          landlord_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          landlord_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      units: {
        Row: {
          id: string
          property_id: string
          unit_number: string
          status: UnitStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          unit_number: string
          status?: UnitStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          unit_number?: string
          status?: UnitStatus
          created_at?: string
          updated_at?: string
        }
      }
      tenants: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          status: TenantStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          email: string
          status?: TenantStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          status?: TenantStatus
          created_at?: string
          updated_at?: string
        }
      }
      access_codes: {
        Row: {
          id: string
          code: string
          lease_id: string
          email: string
          used: boolean
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          lease_id: string
          email: string
          used?: boolean
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          lease_id?: string
          email?: string
          used?: boolean
          expires_at?: string
          created_at?: string
        }
      }
      leases: {
        Row: {
          id: string
          unit_id: string
          tenant_id: string | null
          tenant_email: string
          monthly_rent: number
          late_fee_amount: number
          rent_due_date: number
          opening_balance: number
          start_date: string | null
          status: LeaseStatus
          prorated_rent_charged: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unit_id: string
          tenant_id?: string | null
          tenant_email: string
          monthly_rent: number
          late_fee_amount?: number
          rent_due_date?: number
          opening_balance?: number
          start_date?: string | null
          status?: LeaseStatus
          prorated_rent_charged?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unit_id?: string
          tenant_id?: string | null
          tenant_email?: string
          monthly_rent?: number
          late_fee_amount?: number
          rent_due_date?: number
          opening_balance?: number
          start_date?: string | null
          status?: LeaseStatus
          prorated_rent_charged?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      lease_signatures: {
        Row: {
          id: string
          lease_id: string
          signature_data: string
          ip_address: string | null
          signed_at: string
        }
        Insert: {
          id?: string
          lease_id: string
          signature_data: string
          ip_address?: string | null
          signed_at?: string
        }
        Update: {
          id?: string
          lease_id?: string
          signature_data?: string
          ip_address?: string | null
          signed_at?: string
        }
      }
      tenant_id_documents: {
        Row: {
          id: string
          tenant_id: string
          document_url: string
          document_type: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          document_url: string
          document_type?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          document_url?: string
          document_type?: string | null
          uploaded_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          lease_id: string
          type: TransactionType
          amount: number
          description: string | null
          transaction_date: string
          created_at: string
        }
        Insert: {
          id?: string
          lease_id: string
          type: TransactionType
          amount: number
          description?: string | null
          transaction_date: string
          created_at?: string
        }
        Update: {
          id?: string
          lease_id?: string
          type?: TransactionType
          amount?: number
          description?: string | null
          transaction_date?: string
          created_at?: string
        }
      }
      payment_transactions: {
        Row: {
          id: string
          transaction_id: string | null
          lease_id: string
          gateway: PaymentGateway
          gateway_reference: string | null
          phone_number: string
          amount: number
          status: PaymentStatus
          webhook_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transaction_id?: string | null
          lease_id: string
          gateway: PaymentGateway
          gateway_reference?: string | null
          phone_number: string
          amount: number
          status?: PaymentStatus
          webhook_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string | null
          lease_id?: string
          gateway?: PaymentGateway
          gateway_reference?: string | null
          phone_number?: string
          amount?: number
          status?: PaymentStatus
          webhook_data?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          tenant_id: string
          type: string
          title: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          type: string
          title: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          type?: string
          title?: string
          message?: string
          read?: boolean
          created_at?: string
        }
      }
    }
    Functions: {
      get_lease_balance: {
        Args: { lease_uuid: string }
        Returns: number
      }
      generate_access_code: {
        Args: Record<string, never>
        Returns: string
      }
      calculate_prorated_rent: {
        Args: { p_lease_id: string; p_signup_date: string }
        Returns: number
      }
      charge_rent: {
        Args: { p_lease_id: string }
        Returns: void
      }
      charge_late_fee: {
        Args: { p_lease_id: string }
        Returns: void
      }
      process_daily_billing: {
        Args: Record<string, never>
        Returns: void
      }
      process_late_fees: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}
