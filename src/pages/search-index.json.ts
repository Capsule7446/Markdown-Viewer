import type { APIRoute } from 'astro';
import { buildSearchIndex } from '../lib/search';

// Prerendered to a static /search-index.json, fetched lazily by the palette.
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(buildSearchIndex(), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
