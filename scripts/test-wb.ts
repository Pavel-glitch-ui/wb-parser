import { wbSearchClient } from '../src/shared/api/wb';

async function main() {
  console.log('Testing wbSearchClient.fetchPage...');
  const pageResult = await wbSearchClient.fetchPage('постельное белье', 1);

  if (pageResult.isErr()) {
    console.error('fetchPage Error:', pageResult.error.message, pageResult.error);
  } else {
    const products = pageResult.value;
    console.log(`fetchPage SUCCESS! Received ${products.length} products.`);
    if (products.length > 0) {
      console.log('Sample product keys:', Object.keys(products[0]));
      console.log('Sample product:', JSON.stringify(products[0], null, 2));
    }
  }

  console.log('\nTesting wbSearchClient.fetchSerp (top 5)...');
  const serpResult = await wbSearchClient.fetchSerp('постельное белье', 5);
  if (serpResult.isErr()) {
    console.error('fetchSerp Error:', serpResult.error.message);
  } else {
    console.log(`fetchSerp SUCCESS! Normalized items count: ${serpResult.value.length}`);
    console.log('Sample normalized item:', serpResult.value[0]);
  }
}

main();
