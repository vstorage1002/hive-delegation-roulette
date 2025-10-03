// List of delegators to exclude from the roulette
const EXCLUDED_DELEGATORS = [
  // Add usernames here to exclude them (case insensitive)
  // Example: "bayanihive", "someuser", "anotheruser"
  "vinzie1"
];

// Minimum HP required to be eligible
const MIN_HP = 10;

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
    let entries = 0;

    if (d.hp < 95) {
      // ✅ Tier 1: Below 95 HP (your original logic kept as is)
      entries = Math.floor(d.hp / 10);

      if (d.hp >= 15 && d.hp < 20) {
        entries = 2;
      } else if (d.hp >= 10 && d.hp < 15) {
        entries = 1;
      }

    } else {
      // ✅ Tier 2: 95+ HP
      // 95–150 HP → 1 entry
      // 151–250 HP → 2 entries
      // 251–350 HP → 3 entries, etc.
      entries = Math.floor((d.hp - 95) / 100) + 1;
    }

    // Add entries to pool
    for (let i = 0; i < entries; i++) {
      pool.push(d.username);
    }

    console.log("@" + d.username + ": " + d.hp + " HP → " + entries + " entries");
  });

  return pool;
}

module.exports = { buildDelegatorPool };
