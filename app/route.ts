import html from "../lib/atlas-markup";
export function GET(){return new Response(html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-cache"}});}
