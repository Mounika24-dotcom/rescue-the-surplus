# FoodBridge Hyderabad


**ACE Builders Hackathon 2026 | Problem Statement 2: Rescue the Surplus**

Live app: https://mounika24-dotcom.github.io/rescue-the-surplus/rescue-the-surplus/
Built by: Mounika Yegireddi (solo)

## The problem
Caterers, function halls and event kitchens throw away edible food every day, while NGOs and community kitchens nearby go short. Good intentions exist on both sides, but there is no fast, reliable way to connect surplus food with people who need it before it spoils.

## Who it is for
Starting focus: **Hyderabad**, with **caterers and function halls** as food donors, and **NGOs and community kitchens** as receivers. Delivery volunteers connect the two.

## How it works
1. **Post:** a food donor posts surplus food (what, how much, pickup-by time, consume-within time, allergens, storage) in under a minute.
2. **Claim:** nearby NGOs and kitchens see open food within their chosen radius (2, 5 or 10 km) and claim what they can use.
3. **Deliver:** a volunteer collects and delivers it. Every listing shows a live status: Posted, Claimed, Collected, Delivered.

## Features
- Demo accounts for three roles (food donor, NGO / kitchen, delivery volunteer), each with its own page and an interactive map
- Smart matching: NGOs are ranked by whether they can take the whole quantity, distance and travel time, time left before pickup, and need level, with a plain-language reason for each match
- Live countdowns, status timeline and expiry handling
- Safety information on every listing: consume-within time, storage, allergen warning
- Impact view: meals saved, kg of food rescued and CO2e avoided, with editable assumptions and sources
- Business case: pricing, unit economics with editable inputs, break-even, go-to-market plan and risks
- Data saved in the browser, with a "Reset demo data" button

## Impact assumptions and sources
- 0.42 kg of food per meal (WRAP meal conversion, 420 g per meal). Indicative.
- 4 kg CO2e avoided per kg of food waste prevented (WRAP, via the UK Government Office for Science). UK average, indicative for India; varies by food type.
- All impact numbers come from sample data and are estimates, not verified measurements.

## Guardrails
- The platform connects people and **does not certify that food is safe**. Handling guidance and time limits are shown on every listing.
- No tax or legal benefits are promised to donors.
- Sample data only. All organisations, people and locations are fictional, and map markers show sample locations, not real addresses.

## Business case (summary)
Food donors pay a monthly subscription for listing tools and impact reports, CSR sponsors fund rescued meals, and city authorities can fund coverage. In the base case, break-even is about 16 paying donors. All figures are editable assumptions, and a pilot would test whether donors will pay.

## Built with
- Built entirely in the Codebenders IDE using the Nexen AI agent
- Single-file web app (HTML, CSS, JavaScript)
- Leaflet and OpenStreetMap for the map
- Browser storage for saving state

## Limitations and next steps
- Prototype with demo accounts and sample data; no real sign-in or backend
- Next: real accounts and verified organisations, live notifications (WhatsApp/SMS), a backend database, and expansion to other Telangana cities

## Run it
Open `index.html` in a browser. The map needs an internet connection.

## Third-party components and sources
- Leaflet (open-source mapping library, BSD-2-Clause licence)
- Map data © OpenStreetMap contributors (ODbL), tiles from OpenStreetMap
- Impact assumptions: WRAP meal conversion (420 g per meal) and WRAP via the UK Government Office for Science (about 4 kg CO2e avoided per kg of food waste prevented). Indicative figures, cited for context only.
- No other libraries, datasets or images are used. All organisations, people and locations are fictional sample data.
