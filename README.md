View full documentation at https://docs.satellite.earth/

## Usage

``` js
const Clock = require('@satellite-earth/clock');
const Web3 = require('web3');

// ...

// Create the clock
const clock = new Clock();

// Get a web3 instance to read blockchain data
const web3 = new Web3(provider);

// Populate the clock with data from blocks in the given range
const await clock.synchronize(web3);

// Now the clock is ready to use

```

**Constructor**

1. `Array` - (optional) Array of objects to initialize block data, each containing sequential block data `number`, `hash`, and `timestamp`

## Properties

### initialized

``` js
clock.initialized
```

`Boolean` - If clock has been been initialized (i.e. if it contains record of any blocks)

---

### min

``` js
clock.min
```

`Number|null` - Earliest synced block number (`null` if clock is uninitialized)

---

### max

``` js
clock.max
```

`Number|null` - Latest synced block number (`null` if clock is uninitialized)

## Methods

### init

``` js
clock.init(blocks);
```

Initialize clock's internal data structure. Useful for loading saved clock data instead of having to resynchronize with the blockchain.

**Parameters**

1. `Array` - Array of objects, each containing sequential block data `number`, `hash`, and `timestamp`

---

### synchronize

``` js
await clock.synchronize(earth, { startBlock, toBlock });
```

Populate clock with block data directly from the blockchain. By default, the clock starts synchronizing from it's last synced position, or the latest block available.

**Parameters**

1. `Core` - Earth core instance (used to communicate with blockchain)
2. `Object` - Options
	- `startBlock` - `Number` - Block number of last block to sync
	- `toBlock` - `Number` - Block number of first block to sync

**Returns**

`Promise` returns `Object` - New block data

---

### readHash

``` js
const block = clock.readHash(hash);
console.log(block); // { hash, number, timestamp }
```

Lookup a block's number and timestamp by its hash. Return `undefined` if block not found.

**Parameters**

1. `String` - Block hash
2. `Number` - (optional) Number of blocks between this block and maximum synced block required to return value. Default `0`

**Returns**

`Obejct|undefined` - Block data

---

### readNumber

``` js
const block = clock.readNumber(hash);
console.log(block); // { hash, number, timestamp }
```

Lookup a block's hash and timestamp by its number. Return `undefined` if block not found.

**Parameters**

1. `Number` - Block number
2. `Number` - (optional) Number of blocks between this block an maximum synced block required to return value. Default `0`

**Returns**

`Obejct|undefined` - Block data

---

### compareHash

``` js
const delta = clock.compareHash(hashA, hashB);
console.log(delta) // 42
```

Given two blockhashes, return the difference in their corresponding block's numbers. If either block is not found, return `0`. Useful for sorting blocks by time via hash.

**Parameters**

1. `String` - Hash of one block
2. `String` - Hash of other block

**Returns**

`Number` - Block number difference

---

### advance

``` js
console.log(clock.max); // 10337501
clock.advance({ number, timestamp, hash, parentHash });
console.log(clock.max); // 10337502
```

Add a block to the clock's internal data structure. Throws an error if `parentHash` does not match hash of current maximum block.

**Parameters**

1. `Object` - Block data must be an object containing `number`, `timestamp`, `hash`, and `parentHash`

---

### exportBlocks

``` js
const blocks = clock.exportBlocks();
console.log(blocks); // [ { number, timestamp, hash }, . . . ]
```

Get array of block objects. Useful for exporting block data to be cached elsewhere.

**Parameters**

1. `Object` - (optional) range to export, e.g `{ min: 10337500 max: 10339000 }` (default all blocks)

**Returns**

`Array` - Array of objects containing block data