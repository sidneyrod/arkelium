export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      absence_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cleaner_id: string
          company_id: string
          created_at: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cleaner_id: string
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cleaner_id?: string
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaner_availability: {
        Row: {
          cleaner_id: string
          company_id: string
          created_at: string
          day_of_week: number
          end_time: string | null
          id: string
          is_available: boolean | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          cleaner_id: string
          company_id: string
          created_at?: string
          day_of_week: number
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          cleaner_id?: string
          company_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaner_availability_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaner_availability_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_locations: {
        Row: {
          access_instructions: string | null
          address: string
          alarm_code: string | null
          city: string | null
          client_id: string
          company_id: string
          created_at: string
          has_pets: boolean | null
          id: string
          is_primary: boolean | null
          notes: string | null
          parking_info: string | null
          pet_details: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          access_instructions?: string | null
          address: string
          alarm_code?: string | null
          city?: string | null
          client_id: string
          company_id: string
          created_at?: string
          has_pets?: boolean | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          parking_info?: string | null
          pet_details?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          access_instructions?: string | null
          address?: string
          alarm_code?: string | null
          city?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          has_pets?: boolean | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          parking_info?: string | null
          pet_details?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payment_methods: {
        Row: {
          billing_address: string | null
          client_id: string
          company_id: string
          created_at: string
          expiry_date: string | null
          id: string
          is_default: boolean | null
          label: string | null
          last_four: string | null
          payment_type: string
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          client_id: string
          company_id: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          last_four?: string | null
          payment_type?: string
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          last_four?: string | null
          payment_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_payment_methods_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payment_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_type: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          client_type?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          client_type?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          legal_name: string
          phone: string | null
          postal_code: string | null
          province: string | null
          trade_name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          trade_name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          trade_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_branding: {
        Row: {
          accent_color: string | null
          company_id: string
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          company_id: string
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_branding_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_estimate_config: {
        Row: {
          company_id: string
          created_at: string
          default_hourly_rate: number | null
          id: string
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          default_hourly_rate?: number | null
          id?: string
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          default_hourly_rate?: number | null
          id?: string
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_estimate_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          accepted_at: string | null
          accepted_ip: string | null
          client_id: string
          company_id: string
          contract_number: string
          created_at: string
          end_date: string | null
          frequency: string | null
          id: string
          location_id: string | null
          monthly_value: number | null
          notes: string | null
          services: string[] | null
          signature_url: string | null
          start_date: string | null
          status: string
          terms_accepted: boolean | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_ip?: string | null
          client_id: string
          company_id: string
          contract_number: string
          created_at?: string
          end_date?: string | null
          frequency?: string | null
          id?: string
          location_id?: string | null
          monthly_value?: number | null
          notes?: string | null
          services?: string[] | null
          signature_url?: string | null
          start_date?: string | null
          status?: string
          terms_accepted?: boolean | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_ip?: string | null
          client_id?: string
          company_id?: string
          contract_number?: string
          created_at?: string
          end_date?: string | null
          frequency?: string | null
          id?: string
          location_id?: string | null
          monthly_value?: number | null
          notes?: string | null
          services?: string[] | null
          signature_url?: string | null
          start_date?: string | null
          status?: string
          terms_accepted?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "client_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_fees: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          is_percentage: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_fees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number | null
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          cleaner_id: string | null
          client_id: string
          company_id: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          job_id: string | null
          location_id: string | null
          notes: string | null
          paid_at: string | null
          service_date: string | null
          service_duration: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total: number
          updated_at: string
        }
        Insert: {
          cleaner_id?: string | null
          client_id: string
          company_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          job_id?: string | null
          location_id?: string | null
          notes?: string | null
          paid_at?: string | null
          service_date?: string | null
          service_duration?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
          updated_at?: string
        }
        Update: {
          cleaner_id?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          job_id?: string | null
          location_id?: string | null
          notes?: string | null
          paid_at?: string | null
          service_date?: string | null
          service_duration?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "client_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          checklist: Json | null
          cleaner_id: string | null
          client_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          end_time: string | null
          id: string
          job_type: string | null
          location_id: string | null
          notes: string | null
          scheduled_date: string
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          checklist?: Json | null
          cleaner_id?: string | null
          client_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          job_type?: string | null
          location_id?: string | null
          notes?: string | null
          scheduled_date: string
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          checklist?: Json | null
          cleaner_id?: string | null
          client_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          job_type?: string | null
          location_id?: string | null
          notes?: string | null
          scheduled_date?: string
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "client_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entries: {
        Row: {
          company_id: string
          cpp_deduction: number | null
          created_at: string
          ei_deduction: number | null
          employee_id: string
          gross_pay: number | null
          hourly_rate: number | null
          id: string
          net_pay: number | null
          notes: string | null
          other_deductions: number | null
          overtime_hours: number | null
          period_id: string
          regular_hours: number | null
          tax_deduction: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          cpp_deduction?: number | null
          created_at?: string
          ei_deduction?: number | null
          employee_id: string
          gross_pay?: number | null
          hourly_rate?: number | null
          id?: string
          net_pay?: number | null
          notes?: string | null
          other_deductions?: number | null
          overtime_hours?: number | null
          period_id: string
          regular_hours?: number | null
          tax_deduction?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          cpp_deduction?: number | null
          created_at?: string
          ei_deduction?: number | null
          employee_id?: string
          gross_pay?: number | null
          hourly_rate?: number | null
          id?: string
          net_pay?: number | null
          notes?: string | null
          other_deductions?: number | null
          overtime_hours?: number | null
          period_id?: string
          regular_hours?: number | null
          tax_deduction?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          end_date: string
          id: string
          pay_date: string | null
          period_name: string
          start_date: string
          status: string
          total_deductions: number | null
          total_gross: number | null
          total_hours: number | null
          total_net: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          pay_date?: string | null
          period_name: string
          start_date: string
          status?: string
          total_deductions?: number | null
          total_gross?: number | null
          total_hours?: number | null
          total_net?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          pay_date?: string | null
          period_name?: string
          start_date?: string
          status?: string
          total_deductions?: number | null
          total_gross?: number | null
          total_hours?: number | null
          total_net?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string | null
          employment_type: string | null
          first_name: string | null
          hourly_rate: number | null
          id: string
          last_name: string | null
          phone: string | null
          primary_province: string | null
          salary: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          employment_type?: string | null
          first_name?: string | null
          hourly_rate?: number | null
          id: string
          last_name?: string | null
          phone?: string | null
          primary_province?: string | null
          salary?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          employment_type?: string | null
          first_name?: string | null
          hourly_rate?: number | null
          id?: string
          last_name?: string | null
          phone?: string | null
          primary_province?: string | null
          salary?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: never; Returns: string }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin_or_manager: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "cleaner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "cleaner"],
    },
  },
} as const
