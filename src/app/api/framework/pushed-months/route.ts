import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { error: "brandId is required" },
        { status: 400 }
      );
    }

    // Fetch brand to get timezone
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('timezone')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }

    const brandTimezone = brand.timezone || 'UTC';

    // Query drafts with schedule_source = 'framework'
    // We need to get distinct months from scheduled_for, converted to brand timezone
    // Since PostgreSQL date_trunc works in UTC, we'll need to convert scheduled_for
    // to the brand timezone first, then extract the month
    
    const { data: drafts, error: draftsError } = await supabaseAdmin
      .from('drafts')
      .select('scheduled_for, schedule_source')
      .eq('brand_id', brandId)
      .eq('schedule_source', 'framework')
      .not('scheduled_for', 'is', null);

    if (draftsError) {
      console.error('Error fetching drafts:', draftsError);
      return NextResponse.json(
        { error: "Failed to fetch drafts" },
        { status: 500 }
      );
    }

    console.log(`Found ${drafts?.length || 0} framework drafts for brand ${brandId}`);

    if (!drafts || drafts.length === 0) {
      console.log('No framework drafts found, returning empty locked months');
      return NextResponse.json({ lockedMonths: [] });
    }

    // Convert scheduled_for timestamps to brand timezone and extract YYYY-MM
    // We'll use JavaScript to handle timezone conversion properly
    const monthSet = new Set<string>();
    
    for (const draft of drafts) {
      if (draft.scheduled_for) {
        // Parse the UTC timestamp
        const utcDate = new Date(draft.scheduled_for);
        
        // Convert to brand timezone and format as YYYY-MM
        // Use Intl.DateTimeFormat to get the date in the brand's timezone
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: brandTimezone,
          year: 'numeric',
          month: '2-digit',
        });
        
        const parts = formatter.formatToParts(utcDate);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        
        if (year && month) {
          monthSet.add(`${year}-${month}`);
        }
      }
    }

    // Convert Set to sorted array
    const lockedMonths = Array.from(monthSet).sort();

    console.log(`Locked months for brand ${brandId}:`, lockedMonths);

    return NextResponse.json({ lockedMonths });
  } catch (error) {
    console.error('Error in pushed-months endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

