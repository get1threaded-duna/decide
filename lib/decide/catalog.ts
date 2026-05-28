import type { Item, Modality } from "./types";

export const catalog: Record<Modality, Item[]> = {
  eat: [
    { id: "e1", title: "Korean fried chicken from Bonchon",     meta: "$24 · 22 min delivery · Annandale",     tags: ["evening","weekend","dc","cozy","comfort","korean","easy"], fallback: "Sunday lazy mode, low-effort comfort food at home." },
    { id: "e2", title: "Sheet-pan miso salmon + asparagus",     meta: "Cook · 28 min · 1 pan",                  tags: ["evening","home","healthy","weekend","generic"], fallback: "You've got time and one pan keeps cleanup easy." },
    { id: "e3", title: "Night + Market Song · Silver Lake",     meta: "Thai · $$ · 18 min from LAX",            tags: ["evening","la","social","thai","adventurous","fall"], fallback: "Loud, fast, unmistakably LA after a flight." },
    { id: "e4", title: "In-N-Out 4×4 animal style",             meta: "Drive-thru · $9 · open till 1am",        tags: ["late-night","la","fast-food","comfort","evening","fall"], fallback: "Tired traveler shortcut. Open late, tastes like landing." },
    { id: "e5", title: "Onigiri + miso from FamilyMart",        meta: "¥480 · 3 min walk · grab-and-go",        tags: ["morning","tokyo","quick","light","winter","cold"], fallback: "Warm broth and walking food, Tokyo morning starter pack." },
    { id: "e6", title: "Slow-cooked beef pho at home",          meta: "Hands-off · 4 hours simmer",             tags: ["evening","rainy","cozy","cold","home","comfort"], fallback: "Rain outside, broth inside. Set it and forget it." },
    { id: "e7", title: "Farmers market breakfast tacos",        meta: "Old Town Farmers Market · $6",           tags: ["morning","weekend","dc","sunny","summer","social","casual"], fallback: "Walk there, eat there, browse the stalls after." },
    { id: "e8", title: "Tonkotsu ramen at Daikaya",             meta: "Chinatown DC · $$ · 25 min drive",       tags: ["evening","dc","cold","rainy","social","japanese","comfort"], fallback: "Cold rainy night needs hot pork broth. Non-negotiable." },
  ],
  watch: [
    { id: "w1", title: "The Bear — Season 3, Episode 1",        meta: "45 min · drama · Hulu",                  tags: ["evening","cozy","food","weekend","drama"], fallback: "Arc to finish and the Sunday energy lines up." },
    { id: "w2", title: "Slow Horses — Season 4",                meta: "50 min · thriller · Apple TV+",          tags: ["evening","thriller","weekday","mature","rainy"], fallback: "Tight pacing, no homework, perfect for one and done." },
    { id: "w3", title: "Past Lives",                            meta: "105 min · drama · A24",                  tags: ["evening","drama","cozy","weekend","rainy"], fallback: "Quiet movie for a quiet night, feels how the weather looks." },
    { id: "w4", title: "Parts Unknown — Los Angeles",           meta: "60 min · documentary · HBO",             tags: ["evening","la","food","doc","fall"], fallback: "Bourdain on LA, watched in LA. The matrix completes." },
    { id: "w5", title: "Drive to Survive — latest season",      meta: "50 min · documentary · Netflix",         tags: ["evening","doc","sport","light","weekday"], fallback: "Light enough to half-watch, dramatic enough to stay in." },
    { id: "w6", title: "Top Boy — pilot",                       meta: "50 min · drama · Netflix",               tags: ["evening","drama","urban","mature","weekend"], fallback: "Sharp dialogue and city texture, two of your favorites." },
    { id: "w7", title: "Studio Ghibli short — On Your Mark",    meta: "7 min · animation · YouTube",            tags: ["morning","tokyo","winter","light","animation","weekend"], fallback: "A seven-minute jewel. Coffee, sunrise, screen. Done." },
    { id: "w8", title: "Cowboy Bebop — pilot",                  meta: "25 min · anime · Netflix",               tags: ["late-night","anime","solo","rainy","weekday"], fallback: "Rain, jazz, space cowboys. A vibe nothing else nails." },
  ],
  read: [
    { id: "r1", title: "Mid-career is the wealth window — and most people sleep through it", meta: "8 min · The Hustle", tags: ["business","money","weekend","motivational","evening"], fallback: "Matches your wealth-building lane and it earns the eight minutes." },
    { id: "r2", title: "The case for cheap rural land in 2026", meta: "10 min · BiggerPockets",                 tags: ["real-estate","business","weekend","evening","morning"], fallback: "You analyze deals like this. Numbers are recent." },
    { id: "r3", title: "How small farms beat big ag on yield-per-acre", meta: "12 min · Modern Farmer",         tags: ["homesteading","ag","weekend","morning"], fallback: "Permaculture lane. Concrete yield data, not theory." },
    { id: "r4", title: "Notes on becoming a director of AI agents", meta: "9 min · Substack",                   tags: ["tech","ai","business","evening","weekend"], fallback: "This is literally how you described your own role." },
    { id: "r5", title: "The hip-hop generation at 50",          meta: "14 min · The Atlantic",                  tags: ["music","culture","longread","evening","weekend"], fallback: "Long but it lands. Pour something. Sit with it." },
    { id: "r6", title: "What Korean BBQ teaches about hospitality", meta: "7 min · Eater",                      tags: ["food","business","morning","weekend"], fallback: "Crosses two lanes you care about: food and operator thinking." },
    { id: "r7", title: "Daily rituals of NBA legends",          meta: "5 min · The Ringer",                     tags: ["sports","motivational","morning","weekday"], fallback: "Quick read that pairs with your morning movement plan." },
    { id: "r8", title: "Why MJ Lenderman is the new American songwriter", meta: "6 min · Pitchfork",           tags: ["music","culture","evening","weekend","rainy"], fallback: "New music to dig into while the rain plays through." },
  ],
  do: [
    { id: "d1", title: "Sunset walk · Old Town Alexandria waterfront", meta: "60 min · 18 min drive · free",    tags: ["evening","dc","weekend","outdoor","low-effort","warm"], fallback: "Golden hour, water views, ice cream on the way back." },
    { id: "d2", title: "Mt Vernon Trail · Roosevelt Island loop", meta: "90 min ride · moderate · free",        tags: ["morning","dc","weekend","outdoor","exercise","sunny","summer"], fallback: "Saturday energy, sunny morning. Burn it before the heat." },
    { id: "d3", title: "Griffith Observatory · after-dark visit", meta: "Free · 25 min from Hollywood · open till 10", tags: ["evening","la","outdoor","free","fall","social"], fallback: "Cool air, city lights, no admission, no plan needed." },
    { id: "d4", title: "Echo Park Lake loop + boat house",      meta: "45 min · free · easy",                   tags: ["evening","la","outdoor","free","low-effort"], fallback: "Easy stretch after the flight. Coffee carts open late." },
    { id: "d5", title: "Yoyogi Park · morning walk",            meta: "45 min · free · easy",                   tags: ["morning","tokyo","outdoor","free","winter","cold"], fallback: "Cold air clears jet lag faster than coffee. Trust this." },
    { id: "d6", title: "Try a new recipe night · open kitchen", meta: "90 min · home · creative",               tags: ["evening","home","rainy","creative","cocoon"], fallback: "Rain is good cover for a kitchen experiment." },
    { id: "d7", title: "30-min mobility flow",                  meta: "30 min · home · solo",                   tags: ["anytime","home","exercise","solo"], fallback: "Short, no equipment, big return. You wanted these." },
    { id: "d8", title: "Eastern Market browse + lunch",         meta: "2 hr · DC · $20",                        tags: ["morning","dc","weekend","food","social"], fallback: "Saturday wandering. Eat, browse vinyl, buy weird produce." },
  ],
  listen: [
    { id: "l1", title: "Madlib · Sound Ancestors",              meta: "Album · 41 min · instrumental hip-hop",  tags: ["evening","hiphop","cozy","solo","weekend","lofi"], fallback: "Headphones, no lyrics, full attention. The producer's producer." },
    { id: "l2", title: "Stevie Wonder · Innervisions",          meta: "Album · 44 min · soul classic",          tags: ["morning","weekend","soul","sunny","warm","classic"], fallback: "A Sunday morning album that has earned its place. Press play, let it run." },
    { id: "l3", title: "Robert Glasper · Black Radio",          meta: "Album · 73 min · jazz · hip-hop",         tags: ["evening","jazz","hiphop","rainy","cozy","contemplative"], fallback: "Jazz that respects hip-hop and vice versa. Dinner-cooking music." },
    { id: "l4", title: "The Joe Budden Podcast · latest ep",    meta: "Podcast · 2hr · culture · hiphop",        tags: ["weekday","morning","hiphop","longform","solo","commute"], fallback: "For the drive or the workout. Long-form, opinionated, your lane." },
    { id: "l5", title: "Tyler, The Creator · Chromakopia",      meta: "Album · 53 min · new release",           tags: ["evening","hiphop","exploratory","la","fall"], fallback: "New-Tyler era requires headphones and patience. Sit with it once." },
    { id: "l6", title: "Bon Iver · 22, A Million",              meta: "Album · 34 min · indie folk · ambient",   tags: ["evening","rainy","cocoon","solo","indie","cold"], fallback: "When the rain matches the mood and you want texture, not lyrics." },
    { id: "l7", title: "Morning energy · Travis Scott + Don Toliver mix", meta: "Playlist · 60 min · hip-hop", tags: ["morning","energetic","hiphop","exercise","sunny","summer"], fallback: "BPM up, sun out, lift heavier. Honest soundtrack to a Saturday workout." },
    { id: "l8", title: "Conversations with Tyler · Marc Andreessen ep", meta: "Podcast · 1hr · business · ai", tags: ["weekday","business","ai","longform","solo","commute"], fallback: "You said you're becoming a director of AI agents. This is the room." },
  ],
  connect: [
    { id: "c1", title: "Text someone who comes to mind right now", meta: "2 min · low effort · high return",     tags: ["anytime","low-effort","reflection","solo"], fallback: "Two minutes of intention beats five group dinners. Don't overthink the message." },
    { id: "c2", title: "Father-son Saturday: build something with your hands together", meta: "90 min · home · creative", tags: ["weekend","morning","family","kid","creative","dc"], fallback: "He won't remember the lecture. He'll remember the project." },
    { id: "c3", title: "Call your dad on the drive", meta: "15 min · in transit · low effort",                   tags: ["weekday","morning","family","solo","low-effort","commute"], fallback: "Voice beats text for this one. Catch him before the day swallows you both." },
    { id: "c4", title: "DM the creator at the top of your outreach list", meta: "5 min · work · the message you keep drafting", tags: ["weekday","business","networking","social-media"], fallback: "You've been drafting it in your head for a week. Send the actual one." },
    { id: "c5", title: "Plan a one-on-one with the friend you keep meaning to", meta: "10 min to send · 90 min to live", tags: ["weekday","weekend","social","brotherhood","dc"], fallback: 'A specific date beats "we should grab coffee." Pick a Tuesday and offer it.' },
    { id: "c6", title: "Group chat: drop an old photo and see who responds", meta: "1 min · brotherhood · zero pressure", tags: ["evening","weekend","brotherhood","social","low-effort","reflection"], fallback: "Brotherhood maintenance. No agenda required, just the photo." },
    { id: "c7", title: "Hip-hop or live-music event tonight — go alone if you have to", meta: "Evening · LA · music", tags: ["evening","la","social","music","hiphop","fall"], fallback: "You're in a music city. Trade the hotel room for a room with speakers." },
    { id: "c8", title: "Write one specific encouragement to send tomorrow morning", meta: "5 min · evening · solo work", tags: ["evening","rainy","reflection","solo","low-effort","cocoon"], fallback: "Name one person who needs to hear from you. Write it tonight, send at sunrise." },
  ],
};

export const allInterests = [
  "comfort","healthy","korean","japanese","thai","fast-food","drama","thriller","doc","anime",
  "business","real-estate","ai","music","sports","homesteading","food","outdoor","exercise",
  "creative","social","hiphop","jazz","soul","family","brotherhood","networking","reflection",
] as const;

const allItems = Object.entries(catalog).flatMap(([cat, items]) =>
  items.map(it => [it.id, { ...it, category: cat as Modality }] as const)
);
const itemMap = new Map(allItems);

export function findItem(id: string) {
  return itemMap.get(id);
}
