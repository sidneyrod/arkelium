import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayrollPeriodCheck {
  company_id: string;
  company_name: string;
  period_id: string | null;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
  needs_generation: boolean;
  needs_notification: boolean;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log("Checking payroll periods for all companies...");
    
    // Get all companies
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, trade_name, legal_name");
    
    if (companiesError) {
      console.error("Error fetching companies:", companiesError);
      throw companiesError;
    }
    
    const results: PayrollPeriodCheck[] = [];
    const today = new Date().toISOString().split("T")[0];
    
    for (const company of companies || []) {
      // Check if there's a pending or in-progress period for this company
      const { data: existingPeriod, error: periodError } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("company_id", company.id)
        .in("status", ["pending", "in-progress"])
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (periodError) {
        console.error(`Error fetching period for company ${company.id}:`, periodError);
        continue;
      }
      
      // Get the last paid period to determine next period dates
      const { data: lastPaidPeriod } = await supabase
        .from("payroll_periods")
        .select("end_date")
        .eq("company_id", company.id)
        .eq("status", "paid")
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Calculate next period based on frequency (default biweekly)
      const referenceDate = lastPaidPeriod 
        ? new Date(new Date(lastPaidPeriod.end_date).getTime() + 86400000) // Day after last paid
        : new Date();
      
      // Simple biweekly calculation
      const weekStart = new Date(referenceDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      const periodStart = weekStart.toISOString().split("T")[0];
      const periodEnd = new Date(weekStart.getTime() + 13 * 86400000).toISOString().split("T")[0];
      
      const companyName = company.trade_name || company.legal_name;
      
      if (existingPeriod) {
        // Check if period has ended and needs notification
        const periodEnded = existingPeriod.end_date < today;
        const needsNotification = periodEnded && !existingPeriod.notification_sent;
        
        results.push({
          company_id: company.id,
          company_name: companyName,
          period_id: existingPeriod.id,
          period_name: existingPeriod.period_name,
          start_date: existingPeriod.start_date,
          end_date: existingPeriod.end_date,
          status: existingPeriod.status,
          needs_generation: false,
          needs_notification: needsNotification,
        });
        
        // Mark notification as sent if needed
        if (needsNotification) {
          await supabase
            .from("payroll_periods")
            .update({
              notification_sent: true,
              notification_sent_at: new Date().toISOString(),
            })
            .eq("id", existingPeriod.id);
          
          console.log(`Notification marked for period ${existingPeriod.id}`);
        }
      } else {
        // No active period - needs generation
        results.push({
          company_id: company.id,
          company_name: companyName,
          period_id: null,
          period_name: `${periodStart} - ${periodEnd}`,
          start_date: periodStart,
          end_date: periodEnd,
          status: "not_created",
          needs_generation: true,
          needs_notification: false,
        });
      }
    }
    
    console.log(`Processed ${results.length} companies`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-payroll-periods:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
