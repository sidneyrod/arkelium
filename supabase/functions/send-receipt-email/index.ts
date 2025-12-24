import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Resend API - using fetch instead of SDK for Deno compatibility
const sendResendEmail = async (apiKey: string, options: {
  from: string;
  to: string[];
  subject: string;
  html: string;
}) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
  
  return response.json();
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendReceiptRequest {
  receiptId: string;
  recipientEmail: string;
  recipientName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured. Please add RESEND_API_KEY." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Using the sendResendEmail helper function

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Parse request body
    const { receiptId, recipientEmail, recipientName }: SendReceiptRequest = await req.json();

    if (!receiptId || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "receiptId and recipientEmail are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching receipt ${receiptId} to send to ${recipientEmail}`);

    // Fetch receipt details
    const { data: receipt, error: receiptError } = await supabase
      .from("payment_receipts")
      .select(`
        *,
        clients(name, email),
        profiles:cleaner_id(first_name, last_name)
      `)
      .eq("id", receiptId)
      .single();

    if (receiptError || !receipt) {
      console.error("Failed to fetch receipt:", receiptError);
      return new Response(
        JSON.stringify({ error: "Receipt not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch company details
    const { data: company } = await supabase
      .from("companies")
      .select("trade_name, email, phone")
      .eq("id", receipt.company_id)
      .single();

    const companyName = company?.trade_name || "Our Company";
    const cleanerName = receipt.profiles 
      ? `${receipt.profiles.first_name || ""} ${receipt.profiles.last_name || ""}`.trim() 
      : "Our team";

    // Generate email HTML
    const emailHtml = receipt.receipt_html || generateReceiptHtml(receipt, companyName, cleanerName);

    // Send email using Resend API
    console.log(`Sending receipt email to ${recipientEmail}`);
    const emailResponse = await sendResendEmail(resendApiKey, {
      from: `${companyName} <onboarding@resend.dev>`,
      to: [recipientEmail],
      subject: `Payment Receipt #${receipt.receipt_number}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update receipt with sent status
    const { error: updateError } = await supabase
      .from("payment_receipts")
      .update({
        sent_at: new Date().toISOString(),
        sent_to_email: recipientEmail,
      })
      .eq("id", receiptId);

    if (updateError) {
      console.error("Failed to update receipt sent status:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse?.id,
        sentTo: recipientEmail 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-receipt-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

function generateReceiptHtml(
  receipt: any, 
  companyName: string, 
  cleanerName: string
): string {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Cash",
      e_transfer: "E-Transfer",
      credit_card: "Credit Card",
      cheque: "Cheque",
    };
    return labels[method] || method;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #1a3d2e; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #1a3d2e; margin: 0; }
        .receipt-number { font-size: 14px; color: #666; margin-top: 5px; }
        .details { margin-bottom: 30px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { color: #666; }
        .detail-value { font-weight: 500; }
        .amount-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .amount-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .total-row { font-size: 18px; font-weight: bold; color: #1a3d2e; border-top: 2px solid #1a3d2e; padding-top: 15px; margin-top: 10px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
        .thank-you { background: #1a3d2e; color: white; padding: 15px; text-align: center; border-radius: 8px; margin: 30px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${companyName}</h1>
        <div class="receipt-number">Receipt #${receipt.receipt_number}</div>
      </div>

      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Client:</span>
          <span class="detail-value">${receipt.clients?.name || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service Date:</span>
          <span class="detail-value">${formatDate(receipt.service_date)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service By:</span>
          <span class="detail-value">${cleanerName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Method:</span>
          <span class="detail-value">${getPaymentMethodLabel(receipt.payment_method)}</span>
        </div>
        ${receipt.service_description ? `
        <div class="detail-row">
          <span class="detail-label">Service:</span>
          <span class="detail-value">${receipt.service_description}</span>
        </div>
        ` : ""}
      </div>

      <div class="amount-section">
        <div class="amount-row">
          <span>Subtotal:</span>
          <span>$${receipt.amount.toFixed(2)}</span>
        </div>
        <div class="amount-row">
          <span>Tax:</span>
          <span>$${(receipt.tax_amount || 0).toFixed(2)}</span>
        </div>
        <div class="amount-row total-row">
          <span>Total Paid:</span>
          <span>$${receipt.total.toFixed(2)}</span>
        </div>
      </div>

      ${receipt.notes ? `
      <div style="margin-bottom: 30px;">
        <strong>Notes:</strong>
        <p style="margin: 5px 0; color: #666;">${receipt.notes}</p>
      </div>
      ` : ""}

      <div class="thank-you">
        <strong>Thank you for your payment!</strong>
      </div>

      <div class="footer">
        <p>This is an automated receipt. Please keep this for your records.</p>
        <p>Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
