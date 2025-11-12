// List of delegators to exclude from the roulette
const EXCLUDED_DELEGATORS = [
  // Add usernames here to exclude them (case insensitive)
  // Example: "bayanihive", "someuser", "anotheruser"
  "vinzie1"
];

// Minimum HP required to be eligible
const MIN_HP = 1;

// Tier logic based on HP delegation amounts
function buildDelegatorPool(delegators) {
  const pool = [];

  // Filter out excluded delegators and those below minimum HP
  const eligibleDelegators = delegators.filter(d =>
    !EXCLUDED_DELEGATORS.includes(d.username.toLowerCase()) &&
    d.hp >= MIN_HP
  );

  console.log("Total delegators: " + delegators.length);
  console.log("Eligible delegators (after exclusions + min HP): " + eligibleDelegators.length);
  console.log("Excluded delegators: " + (EXCLUDED_DELEGATORS.length > 0 ? EXCLUDED_DELEGATORS.join(", ") : "none"));

  eligibleDelegators.forEach(d => {
    // ✅ New System: 1 HP = 1 Ticket (with tier separation)
    let entries = 0;

    if (d.hp < 95) {
      // ✅ Tier 1: Below 95 HP → 1 HP = 1 ticket
      entries = Math.floor(d.hp);
    } else {
      // ✅ Tier 2: 95+ HP → 1 HP = 1 ticket
      entries = Math.floor(d.hp);
    }

    // Add entries to pool
    for (let i = 0; i < entries; i++) {
      pool.push(d.username);
    }

    const tier = d.hp < 95 ? "Tier 1" : "Tier 2";
    console.log("@" + d.username + ": " + d.hp + " HP → " + entries + " tickets (" + tier + ")");
  });

  return pool;
}

module.exports = { buildDelegatorPool };
