const hive = require("@hiveio/hive-js");
const { buildDelegatorPool } = require("./src/tiers");

// Configure Hive API
hive.api.setOptions({ url: "https://api.hive.blog" });

// Target account - try a popular Hive account with likely delegators
const ACCOUNT = "ocd"; // Open Community Delegation

// Fetch delegators and run roulette
async function main() {
  console.log("Fetching delegators for @" + ACCOUNT + "...");
  
  // Check if the account exists
  try {
    const accountInfo = await hive.api.getAccountsAsync([ACCOUNT]);
    if (accountInfo.length === 0) {
      console.error("Account @" + ACCOUNT + " not found!");
      return;
    }
    console.log("Account found:", accountInfo[0].name);
  } catch (error) {
    console.error("Error checking account:", error);
    return;
  }

  // Try different API methods to find delegations
  console.log("Trying different API approaches...");
  
  // Method 1: getVestingDelegations
  hive.api.getVestingDelegations(ACCOUNT, "", 1000, (err, result) => {
    if (err) {
      console.error("Error with getVestingDelegations:", err);
      return;
    }

    console.log("getVestingDelegations result:", result);
    console.log("Number of delegations found:", result.length);

    // If still no results, try alternative method
    if (result.length === 0) {
      console.log("Trying alternative API method...");
      
      // Try using callAsync with different parameters
      hive.api.callAsync('condenser_api.get_vesting_delegations', [ACCOUNT, "", 1000], (err2, result2) => {
        if (err2) {
          console.error("Error with callAsync:", err2);
        } else {
          console.log("callAsync result:", result2);
          console.log("Number of delegations found with callAsync:", result2 ? result2.length : 0);
        }
      });
      
      console.log("No delegations found for @" + ACCOUNT);
      console.log("This could mean:");
      console.log("1. The account has no delegators");
      console.log("2. The account name is incorrect");
      console.log("3. The API endpoint is not working");
      console.log("4. The API method parameters are incorrect");
      return;
    }

    // Convert delegations to HP
    const delegators = result.map(d => {
      return {
        username: d.delegator,
        hp: parseFloat(d.vesting_shares) / 1e6 // rough HP conversion
      };
    });

    console.log("Delegators:", delegators);

    // Build roulette pool
    const pool = buildDelegatorPool(delegators);

    if (pool.length === 0) {
      console.log("No eligible delegators found after filtering!");
      return;
    }

    console.log(`Total entries in roulette pool: ${pool.length}`);
    
    // Spin roulette
    const winner = pool[Math.floor(Math.random() * pool.length)];
    console.log("🎉 Winner is @" + winner + "!");
  });
}

main();