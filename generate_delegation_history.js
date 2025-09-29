const hive = require('@hiveio/hive-js');
const fs = require('fs');

// Configure Hive API
hive.api.setOptions({ url: "https://api.hive.blog" });

// Target account (the account receiving delegations)
const ACCOUNT = "bayanihive";

function vestsToHP(vests, totalVestingFundHive, totalVestingShares) {
  return (vests * totalVestingFundHive) / totalVestingShares;
}

async function fetchGlobalProps() {
  return new Promise((resolve, reject) => {
    hive.api.getDynamicGlobalProperties((err, props) => {
      if (err) return reject(err);
      const totalVestingFundHive = parseFloat(props.total_vesting_fund_hive.split(' ')[0]);
      const totalVestingShares = parseFloat(props.total_vesting_shares.split(' ')[0]);
      resolve({ totalVestingFundHive, totalVestingShares });
    });
  });
}

async function generateDelegationHistory() {
  console.log(`🔍 Generating delegation history for @${ACCOUNT}...`);
  
  try {
    // Check if the account exists
    const accountInfo = await hive.api.getAccountsAsync([ACCOUNT]);
    if (!accountInfo || accountInfo.length === 0) {
      console.error("Account @" + ACCOUNT + " not found!");
      return;
    }
    console.log("Account found:", accountInfo[0].name);
    console.log("Received vesting shares:", accountInfo[0].received_vesting_shares);
    
    // Get global properties for VESTS to HP conversion
    const { totalVestingFundHive, totalVestingShares } = await fetchGlobalProps();
    
    // Get account history to find delegation events
    let latestIndex = await new Promise((resolve, reject) => {
      hive.api.getAccountHistory(ACCOUNT, -1, 1, (err, res) => {
        if (err) return reject(err);
        resolve(res[0][0]);
      });
    });
    
    console.log(`Account has ${latestIndex + 1} total operations`);
    
    const rawHistory = [];
    
    if (latestIndex < 999) {
      console.log(`📦 Account has ${latestIndex + 1} operations, fetching all at once...`);
      const history = await new Promise((resolve, reject) => {
        hive.api.getAccountHistory(ACCOUNT, -1, latestIndex + 1, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      });
      if (history && history.length > 0) {
        rawHistory.push(...history);
      }
    } else {
      console.log(`📦 Account has ${latestIndex + 1} operations, using pagination...`);
      let limit = 1000;
      let start = latestIndex;
      let fetchedCount = 0;

      while (true) {
        const adjustedStart = Math.max(start, limit - 1);

        console.log(`🔄 Fetching operations from index ${adjustedStart} (limit: ${limit})`);

        const history = await new Promise((resolve, reject) => {
          hive.api.getAccountHistory(ACCOUNT, adjustedStart, limit, (err, res) => {
            if (err) return reject(err);
            resolve(res);
          });
        });

        if (!history || history.length === 0) {
          console.log(`✅ No more operations found`);
          break;
        }

        rawHistory.push(...history);
        fetchedCount += history.length;
        console.log(`📈 Fetched ${history.length} operations (total: ${fetchedCount})`);

        const nextStart = history[0][0] - 1;
        if (nextStart < 0 || nextStart < limit - 1) {
          if (nextStart >= 0) {
            const remainingLimit = nextStart + 1;
            console.log(`🔄 Fetching remaining ${remainingLimit} operations...`);
            const remainingHistory = await new Promise((resolve, reject) => {
              hive.api.getAccountHistory(ACCOUNT, nextStart, remainingLimit, (err, res) => {
                if (err) return reject(err);
                resolve(res);
              });
            });
            if (remainingHistory && remainingHistory.length > 0) {
              rawHistory.push(...remainingHistory);
              fetchedCount += remainingHistory.length;
              console.log(`📈 Fetched ${remainingHistory.length} remaining operations (total: ${fetchedCount})`);
            }
          }
          break;
        }

        start = nextStart;
        if (history.length < limit) {
          console.log(`✅ Reached end of history (got ${history.length} < ${limit})`);
          break;
        }
      }
    }
    
    console.log(`🔍 Processing ${rawHistory.length} operations for delegation events...`);
    
    // Process delegation events
    const delegationEvents = [];
    
    for (const [, op] of rawHistory) {
      if (op.op[0] === 'delegate_vesting_shares') {
        const { delegator, delegatee, vesting_shares } = op.op[1];
        const timestamp = new Date(op.timestamp + 'Z').getTime();
        const totalVests = parseFloat(vesting_shares);
        
        if (delegatee === ACCOUNT) {
          const hp = vestsToHP(totalVests, totalVestingFundHive, totalVestingShares);
          
          delegationEvents.push({
            delegator,
            totalVests,
            hp: parseFloat(hp.toFixed(3)),
            timestamp,
            date: new Date(timestamp).toISOString().split('T')[0],
          });
        }
      }
    }
    
    // Sort events by timestamp
    delegationEvents.sort((a, b) => a.timestamp - b.timestamp);
    
    // Build delegation history with delta calculations
    const delegationHistory = {};
    
    for (const event of delegationEvents) {
      const { delegator, totalVests, hp, timestamp, date } = event;
      
      if (!delegationHistory[delegator]) {
        delegationHistory[delegator] = [];
      }
      
      const previousEvents = delegationHistory[delegator];
      const previousTotal = previousEvents.length > 0
        ? previousEvents[previousEvents.length - 1].totalVests
        : 0;
      
      const deltaVests = totalVests - previousTotal;
      
      if (Math.abs(deltaVests) > 0.000001) {
        delegationHistory[delegator].push({
          vests: deltaVests,
          totalVests,
          hp: parseFloat(hp.toFixed(3)),
          timestamp,
          date,
        });
        
        console.log(`📝 ${delegator}: ${deltaVests > 0 ? '+' : ''}${deltaVests.toFixed(6)} VESTS (Total: ${totalVests.toFixed(6)} VESTS, ${hp} HP) on ${date}`);
      }
    }
    
    // Save delegation history
    const filename = 'delegation_history.json';
    fs.writeFileSync(filename, JSON.stringify(delegationHistory, null, 2));
    console.log(`✅ Delegation history saved to ${filename}`);
    console.log(`👥 Total delegators: ${Object.keys(delegationHistory).length}`);
    
    // Calculate summary
    let totalHP = 0;
    const latestDelegations = [];
    
    for (const [delegator, events] of Object.entries(delegationHistory)) {
      const latest = events[events.length - 1];
      latestDelegations.push({
        delegator,
        hp: latest.hp,
      });
      totalHP += latest.hp;
    }
    
    // Sort by HP descending
    latestDelegations.sort((a, b) => b.hp - a.hp);
    
    console.log(`\n📊 Summary by delegator:`);
    for (const { delegator, hp } of latestDelegations) {
      const percent = ((hp / totalHP) * 100).toFixed(2);
      console.log(`(${percent}%) ${delegator}: ${hp.toFixed(3)} HP`);
    }
    
    console.log(`\n📈 Total received: ${totalHP.toFixed(3)} HP`);
    console.log(`📈 Account received_vesting_shares: ${accountInfo[0].received_vesting_shares}`);
    
  } catch (error) {
    console.error("Error generating delegation history:", error);
  }
}

generateDelegationHistory();