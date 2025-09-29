const hive = require("@hiveio/hive-js");

// Configure Hive API
hive.api.setOptions({ url: "https://api.hive.blog" });

// Test configuration
const TIER1_TEST_AMOUNT = 1.000; // Tier 1 test amount
const TIER2_TEST_AMOUNT = 2.000; // Tier 2 test amount
const IS_DRY_RUN = true; // Always dry run for testing

// Function to send test reward
async function sendTestReward(to, amount, memo) {
  const fromAccount = process.env.HIVE_USER;
  const activeKey = process.env.HIVE_KEY;
  
  console.log(`\n🧪 Testing reward sending...`);
  console.log(`From: @${fromAccount || 'NOT_SET'}`);
  console.log(`To: @${to}`);
  console.log(`Amount: ${amount} HIVE`);
  console.log(`Memo: ${memo}`);
  
  if (!fromAccount || !activeKey) {
    console.log(`❌ Missing HIVE_USER or HIVE_KEY environment variables.`);
    console.log(`   Set these environment variables to test actual sending:`);
    console.log(`   export HIVE_USER="your_account"`);
    console.log(`   export HIVE_KEY="your_private_key"`);
    return false;
  }
  
  if (IS_DRY_RUN) {
    console.log(`🧪 DRY-RUN: Would send ${amount.toFixed(3)} HIVE from @${fromAccount} to @${to}`);
    console.log(`🧪 Memo: ${memo}`);
    console.log(`✅ Dry run successful!`);
    return true;
  }
  
  try {
    return new Promise((resolve, reject) => {
      hive.broadcast.transfer(
        activeKey,
        fromAccount,
        to,
        `${amount.toFixed(3)} HIVE`,
        memo,
        (err, result) => {
          if (err) {
            console.error(`❌ Failed to send reward to @${to}:`, err.message);
            reject(err);
          } else {
            console.log(`✅ Sent ${amount.toFixed(3)} HIVE to @${to}`);
            console.log(`📝 Transaction ID: ${result.id}`);
            resolve(result);
          }
        }
      );
    });
  } catch (error) {
    console.error(`❌ Error sending reward to @${to}:`, error);
    return false;
  }
}

async function testRewards() {
  console.log(`🧪 Testing Hive Delegation Roulette Reward System`);
  console.log(`================================================`);
  
  // Test 1: Dry run without credentials
  console.log(`\n📋 Test 1: Dry run without credentials`);
  await sendTestReward("steembasicincome", TIER1_TEST_AMOUNT, "@vinzie1:@testuser1");
  await sendTestReward("steembasicincome", TIER2_TEST_AMOUNT, "@vinzie1:@testuser2");
  
  // Test 2: Check if credentials are available
  console.log(`\n📋 Test 2: Check credentials availability`);
  const hasCredentials = process.env.HIVE_USER && process.env.HIVE_KEY;
  console.log(`HIVE_USER: ${process.env.HIVE_USER ? '✅ Set' : '❌ Not set'}`);
  console.log(`HIVE_KEY: ${process.env.HIVE_KEY ? '✅ Set' : '❌ Not set'}`);
  
  if (hasCredentials) {
    console.log(`\n📋 Test 3: Dry run with credentials`);
    await sendTestReward("steembasicincome", TIER1_TEST_AMOUNT, "@vinzie1:@testuser1");
    await sendTestReward("steembasicincome", TIER2_TEST_AMOUNT, "@vinzie1:@testuser2");
  } else {
    console.log(`\n⚠️ To test actual sending, set environment variables:`);
    console.log(`   export HIVE_USER="your_account"`);
    console.log(`   export HIVE_KEY="your_private_key"`);
    console.log(`   Then run: node test-rewards.js`);
  }
  
  console.log(`\n🎯 To test with real sending (NOT recommended for testing):`);
  console.log(`   1. Set IS_DRY_RUN = false in this file`);
  console.log(`   2. Set your HIVE_USER and HIVE_KEY environment variables`);
  console.log(`   3. Run: node test-rewards.js`);
  console.log(`\n⚠️ WARNING: This will send real HIVE tokens!`);
}

testRewards().catch(console.error);
