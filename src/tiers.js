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
        // Tier 1: Below 95 HP
        entries = Math.floor(d.hp / 10);
        
        if (d.hp >= 15 && d.hp < 20) {
          entries = 2;
        } else if (d.hp >= 10 && d.hp < 15) {
          entries = 1;
        }
        
      } else if (d.hp >= 95 && d.hp < 100) {
        // Transition zone: 95-99 HP moves to Tier 2 logic
        const tier2Hp = d.hp;
        entries = Math.ceil(tier2Hp / 100);
        if (entries === 0) entries = 1;
        
      } else {
        // Tier 2: 100+ HP
        // For every 100 HP delegation = 1 entry (using ceiling)
        // 129 HP = 2 entries, 150 HP = 2 entries, 281 HP = 3 entries
        entries = Math.ceil(d.hp / 100);
        if (entries === 0) entries = 1;
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