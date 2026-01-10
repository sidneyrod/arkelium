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
          request_type: string
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
          request_type?: string
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
          request_type?: string
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
          after_data: Json | null
          before_data: Json | null
          company_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          performed_by_user_id: string | null
          reason: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          company_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          performed_by_user_id?: string | null
          reason?: string | null
          source?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          company_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          performed_by_user_id?: string | null
          reason?: string | null
          source?: string
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
      cash_collections: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          cash_handling: string
          cleaner_id: string
          client_id: string
          company_id: string
          compensation_status: string
          created_at: string
          dispute_reason: string | null
          disputed_at: string | null
          disputed_by: string | null
          handled_at: string
          handled_by_user_id: string | null
          id: string
          job_id: string
          notes: string | null
          payment_receipt_id: string | null
          payroll_period_id: string | null
          service_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          cash_handling: string
          cleaner_id: string
          client_id: string
          company_id: string
          compensation_status?: string
          created_at?: string
          dispute_reason?: string | null
          disputed_at?: string | null
          disputed_by?: string | null
          handled_at?: string
          handled_by_user_id?: string | null
          id?: string
          job_id: string
          notes?: string | null
          payment_receipt_id?: string | null
          payroll_period_id?: string | null
          service_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          cash_handling?: string
          cleaner_id?: string
          client_id?: string
          company_id?: string
          compensation_status?: string
          created_at?: string
          dispute_reason?: string | null
          disputed_at?: string | null
          disputed_by?: string | null
          handled_at?: string
          handled_by_user_id?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          payment_receipt_id?: string | null
          payroll_period_id?: string | null
          service_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_collections_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_collections_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_collections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_collections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_collections_disputed_by_fkey"
            columns: ["disputed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_collections_handled_by_user_id_fkey"
            columns: ["handled_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_collections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_collections_payment_receipt_id_fkey"
            columns: ["payment_receipt_id"]
            isOneToOne: false
            referencedRelation: "payment_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_collections_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: Database["public"]["Enums"]["account_type"]
          company_id: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          parent_code: string | null
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: Database["public"]["Enums"]["account_type"]
          company_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          parent_code?: string | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          company_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          parent_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          monthly_exceptions: Json | null
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
          monthly_exceptions?: Json | null
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
          monthly_exceptions?: Json | null
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
      cleaner_payments: {
        Row: {
          admin_approval_status: string | null
          admin_approved_at: string | null
          admin_approved_by: string | null
          admin_rejection_reason: string | null
          amount_due: number
          cash_handling_choice: string | null
          cash_received_by_cleaner: boolean | null
          cleaner_id: string
          company_id: string
          created_at: string
          deduct_from_payroll: boolean | null
          fixed_amount: number | null
          hourly_rate: number | null
          hours_worked: number | null
          id: string
          job_id: string
          job_total: number | null
          notes: string | null
          paid_at: string | null
          payment_model: string
          percentage_rate: number | null
          period_id: string | null
          service_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          admin_approval_status?: string | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_rejection_reason?: string | null
          amount_due: number
          cash_handling_choice?: string | null
          cash_received_by_cleaner?: boolean | null
          cleaner_id: string
          company_id: string
          created_at?: string
          deduct_from_payroll?: boolean | null
          fixed_amount?: number | null
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          job_id: string
          job_total?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_model: string
          percentage_rate?: number | null
          period_id?: string | null
          service_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          admin_approval_status?: string | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_rejection_reason?: string | null
          amount_due?: number
          cash_handling_choice?: string | null
          cash_received_by_cleaner?: boolean | null
          cleaner_id?: string
          company_id?: string
          created_at?: string
          deduct_from_payroll?: boolean | null
          fixed_amount?: number | null
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          job_id?: string
          job_total?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_model?: string
          percentage_rate?: number | null
          period_id?: string | null
          service_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
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
          address: string | null
          city: string | null
          client_type: string | null
          company_id: string
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_type?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          client_type?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
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
          business_number: string | null
          city: string | null
          created_at: string
          dedicated_connection_id: string | null
          email: string | null
          id: string
          legal_name: string
          phone: string | null
          postal_code: string | null
          province: string | null
          status: string
          tenant_mode: string
          timezone: string | null
          trade_name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_number?: string | null
          city?: string | null
          created_at?: string
          dedicated_connection_id?: string | null
          email?: string | null
          id?: string
          legal_name: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          status?: string
          tenant_mode?: string
          timezone?: string | null
          trade_name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_number?: string | null
          city?: string | null
          created_at?: string
          dedicated_connection_id?: string | null
          email?: string | null
          id?: string
          legal_name?: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          status?: string
          tenant_mode?: string
          timezone?: string | null
          trade_name?: string
          updated_at?: string
          website?: string | null
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
          accounting_date_field: string
          accounting_method: string
          admin_is_cleaner: boolean | null
          auto_generate_cash_receipt: boolean | null
          auto_send_cash_receipt: boolean | null
          company_id: string
          created_at: string
          default_hourly_rate: number | null
          enable_cash_kept_by_employee: boolean | null
          id: string
          include_visits_in_reports: boolean | null
          invoice_generation_mode: string
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          accounting_date_field?: string
          accounting_method?: string
          admin_is_cleaner?: boolean | null
          auto_generate_cash_receipt?: boolean | null
          auto_send_cash_receipt?: boolean | null
          company_id: string
          created_at?: string
          default_hourly_rate?: number | null
          enable_cash_kept_by_employee?: boolean | null
          id?: string
          include_visits_in_reports?: boolean | null
          invoice_generation_mode?: string
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          accounting_date_field?: string
          accounting_method?: string
          admin_is_cleaner?: boolean | null
          auto_generate_cash_receipt?: boolean | null
          auto_send_cash_receipt?: boolean | null
          company_id?: string
          created_at?: string
          default_hourly_rate?: number | null
          enable_cash_kept_by_employee?: boolean | null
          id?: string
          include_visits_in_reports?: boolean | null
          invoice_generation_mode?: string
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
      custom_roles: {
        Row: {
          base_role: Database["public"]["Enums"]["app_role"]
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          base_role?: Database["public"]["Enums"]["app_role"]
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          base_role?: Database["public"]["Enums"]["app_role"]
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      financial_adjustments: {
        Row: {
          cleaner_id: string | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deductions: number
          description: string
          event_type: Database["public"]["Enums"]["financial_event_type"]
          gross_amount: number
          id: string
          invoice_id: string | null
          job_id: string | null
          net_amount: number
          notes: string | null
          payment_method:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          reference_number: string | null
          status: string
          transaction_date: string
          updated_at: string
        }
        Insert: {
          cleaner_id?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deductions?: number
          description: string
          event_type: Database["public"]["Enums"]["financial_event_type"]
          gross_amount?: number
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          net_amount?: number
          notes?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          reference_number?: string | null
          status?: string
          transaction_date?: string
          updated_at?: string
        }
        Update: {
          cleaner_id?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deductions?: number
          description?: string
          event_type?: Database["public"]["Enums"]["financial_event_type"]
          gross_amount?: number
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          net_amount?: number
          notes?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          reference_number?: string | null
          status?: string
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_adjustments_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closed_reason: string | null
          company_id: string
          created_at: string
          end_date: string
          id: string
          period_name: string
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          period_name: string
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          period_name?: string
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          accounting_date: string
          amount_gross: number
          amount_net: number
          amount_tax: number
          cleaner_id: string | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          description: string
          id: string
          invoice_id: string | null
          invoice_issued_at: string | null
          is_void: boolean
          job_id: string | null
          notes: string | null
          paid_out_at: string | null
          payment_method: string | null
          payroll_period_id: string | null
          receipt_id: string | null
          received_at: string | null
          reference_code: string | null
          reversal_of: string | null
          service_completed_at: string | null
          source_type: Database["public"]["Enums"]["financial_source_type"]
          status: string
          transaction_type: Database["public"]["Enums"]["financial_transaction_type"]
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          accounting_date: string
          amount_gross?: number
          amount_net?: number
          amount_tax?: number
          cleaner_id?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description: string
          id?: string
          invoice_id?: string | null
          invoice_issued_at?: string | null
          is_void?: boolean
          job_id?: string | null
          notes?: string | null
          paid_out_at?: string | null
          payment_method?: string | null
          payroll_period_id?: string | null
          receipt_id?: string | null
          received_at?: string | null
          reference_code?: string | null
          reversal_of?: string | null
          service_completed_at?: string | null
          source_type: Database["public"]["Enums"]["financial_source_type"]
          status?: string
          transaction_type: Database["public"]["Enums"]["financial_transaction_type"]
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          accounting_date?: string
          amount_gross?: number
          amount_net?: number
          amount_tax?: number
          cleaner_id?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          id?: string
          invoice_id?: string | null
          invoice_issued_at?: string | null
          is_void?: boolean
          job_id?: string | null
          notes?: string | null
          paid_out_at?: string | null
          payment_method?: string | null
          payroll_period_id?: string | null
          receipt_id?: string | null
          received_at?: string | null
          reference_code?: string | null
          reversal_of?: string | null
          service_completed_at?: string | null
          source_type?: Database["public"]["Enums"]["financial_source_type"]
          status?: string
          transaction_type?: Database["public"]["Enums"]["financial_transaction_type"]
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "payment_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          payment_amount: number | null
          payment_date: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_received_by: string | null
          payment_reference: string | null
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
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_received_by?: string | null
          payment_reference?: string | null
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
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_received_by?: string | null
          payment_reference?: string | null
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
          after_photos: Json | null
          before_photos: Json | null
          checklist: Json | null
          cleaner_id: string | null
          client_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          end_time: string | null
          id: string
          is_billable: boolean | null
          job_type: string | null
          location_id: string | null
          notes: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_received_by: string | null
          payment_reference: string | null
          scheduled_date: string
          start_time: string | null
          status: string
          updated_at: string
          visit_next_action: string | null
          visit_notes: string | null
          visit_outcome: string | null
          visit_purpose: string | null
          visit_route: string | null
        }
        Insert: {
          after_photos?: Json | null
          before_photos?: Json | null
          checklist?: Json | null
          cleaner_id?: string | null
          client_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_billable?: boolean | null
          job_type?: string | null
          location_id?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_received_by?: string | null
          payment_reference?: string | null
          scheduled_date: string
          start_time?: string | null
          status?: string
          updated_at?: string
          visit_next_action?: string | null
          visit_notes?: string | null
          visit_outcome?: string | null
          visit_purpose?: string | null
          visit_route?: string | null
        }
        Update: {
          after_photos?: Json | null
          before_photos?: Json | null
          checklist?: Json | null
          cleaner_id?: string | null
          client_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_billable?: boolean | null
          job_type?: string | null
          location_id?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_received_by?: string | null
          payment_reference?: string | null
          scheduled_date?: string
          start_time?: string | null
          status?: string
          updated_at?: string
          visit_next_action?: string | null
          visit_notes?: string | null
          visit_outcome?: string | null
          visit_purpose?: string | null
          visit_route?: string | null
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
      ledger_entries: {
        Row: {
          account_code: string
          account_name: string
          company_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          financial_transaction_id: string
          id: string
          ledger_date: string
        }
        Insert: {
          account_code: string
          account_name: string
          company_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          financial_transaction_id: string
          id?: string
          ledger_date: string
        }
        Update: {
          account_code?: string
          account_name?: string
          company_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          financial_transaction_id?: string
          id?: string
          ledger_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notify_invoices: boolean
          notify_job_cancellations: boolean
          notify_job_changes: boolean
          notify_new_jobs: boolean
          notify_off_request_status: boolean
          notify_off_requests: boolean
          notify_payroll: boolean
          notify_system: boolean
          notify_visits: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notify_invoices?: boolean
          notify_job_cancellations?: boolean
          notify_job_changes?: boolean
          notify_new_jobs?: boolean
          notify_off_request_status?: boolean
          notify_off_requests?: boolean
          notify_payroll?: boolean
          notify_system?: boolean
          notify_visits?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notify_invoices?: boolean
          notify_job_cancellations?: boolean
          notify_job_changes?: boolean
          notify_new_jobs?: boolean
          notify_off_request_status?: boolean
          notify_off_requests?: boolean
          notify_payroll?: boolean
          notify_system?: boolean
          notify_visits?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          read_at: string | null
          recipient_user_id: string | null
          role_target: string | null
          severity: Database["public"]["Enums"]["notification_severity"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          read_at?: string | null
          recipient_user_id?: string | null
          role_target?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"]
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_user_id?: string | null
          role_target?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"]
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          amount: number
          cleaner_id: string | null
          client_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          job_id: string
          notes: string | null
          payment_method: string
          receipt_html: string | null
          receipt_number: string
          sent_at: string | null
          sent_to_email: string | null
          service_date: string
          service_description: string | null
          tax_amount: number | null
          total: number
          updated_at: string
        }
        Insert: {
          amount: number
          cleaner_id?: string | null
          client_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id: string
          notes?: string | null
          payment_method: string
          receipt_html?: string | null
          receipt_number: string
          sent_at?: string | null
          sent_to_email?: string | null
          service_date: string
          service_description?: string | null
          tax_amount?: number | null
          total: number
          updated_at?: string
        }
        Update: {
          amount?: number
          cleaner_id?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          payment_method?: string
          receipt_html?: string | null
          receipt_number?: string
          sent_at?: string | null
          sent_to_email?: string | null
          service_date?: string
          service_description?: string | null
          tax_amount?: number | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
          notification_sent: boolean | null
          notification_sent_at: string | null
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
          notification_sent?: boolean | null
          notification_sent_at?: string | null
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
          notification_sent?: boolean | null
          notification_sent_at?: string | null
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
      permissions: {
        Row: {
          action: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean | null
          module: string
          updated_at: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          module: string
          updated_at?: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          module?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          company_id: string
          country: string | null
          created_at: string
          email: string | null
          employment_type: string | null
          first_name: string | null
          fixed_amount_per_job: number | null
          hourly_rate: number | null
          id: string
          last_login_at: string | null
          last_name: string | null
          must_change_password: boolean | null
          payment_model: string | null
          percentage_of_job_total: number | null
          phone: string | null
          postal_code: string | null
          primary_province: string | null
          province: string | null
          salary: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          email?: string | null
          employment_type?: string | null
          first_name?: string | null
          fixed_amount_per_job?: number | null
          hourly_rate?: number | null
          id: string
          last_login_at?: string | null
          last_name?: string | null
          must_change_password?: boolean | null
          payment_model?: string | null
          percentage_of_job_total?: number | null
          phone?: string | null
          postal_code?: string | null
          primary_province?: string | null
          province?: string | null
          salary?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          email?: string | null
          employment_type?: string | null
          first_name?: string | null
          fixed_amount_per_job?: number | null
          hourly_rate?: number | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          must_change_password?: boolean | null
          payment_model?: string | null
          percentage_of_job_total?: number | null
          phone?: string | null
          postal_code?: string | null
          primary_province?: string | null
          province?: string | null
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
      role_permissions: {
        Row: {
          company_id: string
          created_at: string
          granted: boolean | null
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          granted?: boolean | null
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          granted?: boolean | null
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_configurations: {
        Row: {
          company_id: string
          cpp_employee_rate: number | null
          cpp_employer_rate: number | null
          cpp_max_contribution: number | null
          created_at: string
          ei_employee_rate: number | null
          ei_employer_rate: number | null
          ei_max_contribution: number | null
          id: string
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          cpp_employee_rate?: number | null
          cpp_employer_rate?: number | null
          cpp_max_contribution?: number | null
          created_at?: string
          ei_employee_rate?: number | null
          ei_employer_rate?: number | null
          ei_max_contribution?: number | null
          id?: string
          updated_at?: string
          year?: number
        }
        Update: {
          company_id?: string
          cpp_employee_rate?: number | null
          cpp_employer_rate?: number | null
          cpp_max_contribution?: number | null
          created_at?: string
          ei_employee_rate?: number | null
          ei_employer_rate?: number | null
          ei_max_contribution?: number | null
          id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_configurations_company_id_fkey"
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
          custom_role_id: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          custom_role_id?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          custom_role_id?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
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
          {
            foreignKeyName: "user_roles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      financial_ledger: {
        Row: {
          cleaner_id: string | null
          cleaner_name: string | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          created_at: string | null
          deductions: number | null
          event_type: string | null
          gross_amount: number | null
          id: string | null
          job_id: string | null
          net_amount: number | null
          notes: string | null
          payment_method: string | null
          reference_number: string | null
          service_reference: string | null
          status: string | null
          transaction_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_default_chart_of_accounts: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      get_completed_services_pending_invoices:
        | {
            Args: never
            Returns: {
              address: string
              cleaner_first_name: string
              cleaner_id: string
              cleaner_last_name: string
              client_id: string
              client_name: string
              completed_at: string
              duration_minutes: number
              id: string
              job_type: string
              scheduled_date: string
            }[]
          }
        | {
            Args: { p_company_id: string }
            Returns: {
              cleaner_id: string
              cleaner_name: string
              client_id: string
              client_name: string
              completed_at: string
              duration_minutes: number
              job_id: string
              job_type: string
              service_date: string
            }[]
          }
      get_current_period: { Args: { p_company_id: string }; Returns: string }
      get_financial_report_data: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          accounting_date: string
          amount_gross: number
          amount_net: number
          amount_tax: number
          cleaner_name: string
          client_name: string
          company_id: string
          created_at: string
          currency: string
          description: string
          id: string
          invoice_issued_at: string
          invoice_number: string
          is_void: boolean
          job_type: string
          notes: string
          paid_out_at: string
          payment_method: string
          received_at: string
          reference_code: string
          service_completed_at: string
          source_type: Database["public"]["Enums"]["financial_source_type"]
          status: string
          transaction_type: Database["public"]["Enums"]["financial_transaction_type"]
        }[]
      }
      get_financial_summary: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          net_result: number
          total_adjustments: number
          total_paid_out: number
          total_received: number
          total_tax_collected: number
          transaction_count: number
        }[]
      }
      get_ledger_summary: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          account_code: string
          account_name: string
          balance: number
          total_credit: number
          total_debit: number
        }[]
      }
      get_next_payroll_period: {
        Args: { p_frequency: string; p_reference_date?: string }
        Returns: {
          end_date: string
          start_date: string
        }[]
      }
      get_user_company_id: { Args: never; Returns: string }
      get_user_permissions: {
        Args: never
        Returns: {
          action: string
          granted: boolean
          module: string
        }[]
      }
      has_permission: {
        Args: { p_action: string; p_module: string }
        Returns: boolean
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      initialize_company_permissions: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      is_admin_or_manager: { Args: never; Returns: boolean }
      is_period_open: {
        Args: { p_company_id: string; p_date: string }
        Returns: boolean
      }
      mark_all_notifications_as_read: { Args: never; Returns: number }
      mark_notification_as_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      app_role: "admin" | "manager" | "cleaner"
      financial_event_type:
        | "invoice"
        | "payment"
        | "visit"
        | "payroll"
        | "refund"
        | "adjustment"
      financial_source_type:
        | "service"
        | "invoice"
        | "payroll"
        | "expense"
        | "refund"
        | "manual"
      financial_transaction_type: "received" | "paid_out" | "adjustment"
      notification_severity: "info" | "warning" | "critical"
      notification_type:
        | "job"
        | "visit"
        | "off_request"
        | "invoice"
        | "payroll"
        | "system"
        | "financial"
      payment_method_type:
        | "cash"
        | "e_transfer"
        | "cheque"
        | "credit_card"
        | "bank_transfer"
        | "no_charge"
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
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      app_role: ["admin", "manager", "cleaner"],
      financial_event_type: [
        "invoice",
        "payment",
        "visit",
        "payroll",
        "refund",
        "adjustment",
      ],
      financial_source_type: [
        "service",
        "invoice",
        "payroll",
        "expense",
        "refund",
        "manual",
      ],
      financial_transaction_type: ["received", "paid_out", "adjustment"],
      notification_severity: ["info", "warning", "critical"],
      notification_type: [
        "job",
        "visit",
        "off_request",
        "invoice",
        "payroll",
        "system",
        "financial",
      ],
      payment_method_type: [
        "cash",
        "e_transfer",
        "cheque",
        "credit_card",
        "bank_transfer",
        "no_charge",
      ],
    },
  },
} as const
