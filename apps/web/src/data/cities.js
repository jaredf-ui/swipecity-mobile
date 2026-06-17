// Canonical list of cities SwipeCity supports. Buyers pick which of these they
// want to shop in; sellers pick one when posting. Because both sides choose from
// THIS exact list, a buyer's city selection always matches a listing's city —
// no geolocation, no stored coordinates, no distance math.
//
// Raleigh is the launch market, so the NC Triangle leads the list; major US
// metros follow. Keep strings in "City, ST" form and keep this list as the
// single source of truth (seeded seller locations should use these exact values).

export const SUPPORTED_CITIES = [
  // Launch market — NC Triangle
  'Raleigh, NC',
  'Durham, NC',
  'Cary, NC',
  'Chapel Hill, NC',
  'Charlotte, NC',
  'Greensboro, NC',
  // Major US metros
  'Atlanta, GA',
  'Austin, TX',
  'Boston, MA',
  'Chicago, IL',
  'Dallas, TX',
  'Denver, CO',
  'Houston, TX',
  'Los Angeles, CA',
  'Miami, FL',
  'Nashville, TN',
  'New York, NY',
  'Philadelphia, PA',
  'Phoenix, AZ',
  'Portland, OR',
  'San Francisco, CA',
  'Seattle, WA',
  'Washington, DC',
];

// The market we lead with; used as a sensible default selection.
export const DEFAULT_CITY = 'Raleigh, NC';

export default SUPPORTED_CITIES;
