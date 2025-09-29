// List of delegators to exclude from the roulette
const EXCLUDED_DELEGATORS = [
  // Add usernames here to exclude them (case insensitive)
  // Example: "bayanihive", "someuser", "anotheruser"
];

// Tier logic based on HP delegation amounts
function buildDelegatorPool(delegators) {
  const pool = [];
  
  // Filter out excluded delegators
  const eligibleDelegators = delegators.filter(d => 
    !EXCLUDED_DELEGATORS.includes(d.username.toLowerCase())
  );
  
  console.log(`Total delegators: ${delegators.length}`);
  console.log(`Eligible delegators (after exclusions): ${eligibleDelegators.length}`);
  console.log(`Excluded delegators: ${EXCLUDED_DELEGATORS.join(', ')}`);
  
  eligibleDelegators.forEach(d => {
    let entries = 0;
    
    if (d.hp < 95) {
      // Tier 1: Below 95 HP
      // For every 10 HP delegation = 1 entry
      // Use floor for 12, ceiling for 15, etc.
      entries = Math.floor(d.hp / 10);
      
      // Special handling for 15 HP case (should be 2 entries)
      if (d.hp >= 15 && d.hp < 20) {
        entries = 2;
      } else if (d.hp >= 10 && d.hp < 15) {
        entries = 1;
      }
      
    } else if (d.hp >= 95 && d.hp < 100) {
      // Transition zone: 95-99 HP moves to Tier 2 logic
      // Treat as Tier 2 with 100+ HP
      const tier2Hp = d.hp;
      entries = Math.floor(tier2Hp / 100);
      if (entries === 0) entries = 1; // Minimum 1 entry for Tier 2
      
    } else {
      // Tier 2: 100+ HP
      // For every 100 HP delegation = 1 entry
      // 129 HP = 1 entry, 150 HP = 2 entries
      entries = Math.floor(d.hp / 100);
      if (entries === 0) entries = 1; // Minimum 1 entry for Tier 2
    }
    
    // Add entries to pool
    for (let i = 0; i < entries; i++) {
      pool.push(d.username);
    }
    
    console.log(`@${d.username}: ${d.hp} HP → ${entries} entries`);
  });
  
  return pool;
}

module.exports = { buildDelegatorPool };
