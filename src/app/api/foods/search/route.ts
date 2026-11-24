import { NextRequest, NextResponse } from 'next/server';

const OPENFOODFACTS_SEARCH_URL = 'https://br.openfoodfacts.org/cgi/search.pl';
const REQUEST_TIMEOUT_MS = 6000;
const FIELDS =
  'code,product_name_pt,product_name,generic_name_pt,generic_name,brands,categories,categories_tags,serving_size,serving_quantity,quantity,nutriments';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 100);
  if (q.length < 2) {
    return NextResponse.json({ products: [], isOffline: false });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      search_terms: q,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '20',
      fields: FIELDS,
    });

    const res = await fetch(`${OPENFOODFACTS_SEARCH_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'IronPulse/1.0 (+https://ironpulse.app)',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ products: [], isOffline: true });
    }

    const json = await res.json();
    const products = Array.isArray(json?.products) ? json.products : [];
    return NextResponse.json({ products, isOffline: false });
  } catch {
    return NextResponse.json({ products: [], isOffline: true });
  } finally {
    clearTimeout(timer);
  }
}
