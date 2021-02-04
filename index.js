
// The directly observable, regular process of new blocks being
// created by the Ethereum blockchain can be used to establish
// an objective notion of time. *The special thing about this
// clock is that it cannot be used to refer to the future.*
// Using blockhashes to refer to moments in time (+= average
// blocktime) supports the integrity of the ecosystem by making
// it effectively impossible to "post date" signed social data.
class Clock {

	constructor (blocks) {
		this.init(blocks);
	}

	// Meta data for Ethereum blocks: 'ordinal' maps block numbers
	// to the block's hash and timestamp, whereas 'nominal' allows
	// for lookup of a block's number given its hash. Calling this
	// function creates the initial map (overwriting any existing)
	// unless 'blocks' is provided as the initial value. Since the
	// data set can be quite large loading with init can be faster
	init (blocks) {

		// Create data structure
		this.blocks = {
			ordinal: { /*[number]: { timestamp, hash }*/ },
			nominal: { /*[hash]: number*/ }
		};

		// Populate with provided blocks, if any
		if (blocks) {
			for (let n = 0; n < blocks.length; n++) {
				const parent = blocks[n - 1];
				this.advance({ ...blocks[n], parentHash: parent ? parent.hash : null });
			}
		}
	}

	// Get hash, number, and timestamp for every block in range
	async synchronize (eth, options = {}) {

		const newBlocks = {};
		let toBlock = options.toBlock;
		let fromBlock;

		// Assume all blocks in range will be synced
		let inRange = () => { return true; }

		// Start from specified block, or latest
		if (typeof toBlock === 'undefined') {

			if (!eth || !eth.getBlockNumber) {
				throw Error('Missing eth interface function \'getBlockNumber\'');
			}

			toBlock = await eth.getBlockNumber();
		}

		if (this.initialized) { // Already synchronized

			// Nothing to sync, return
			if (toBlock <= this.max.number) {
				console.log('skipped clock sync');
				return;
			}

			// Start from next unsynced block
			fromBlock = this.max.number + 1;
			
		} else { // First sync

			// Start syncing from specified startBlock, falling back to initial toBlock
			fromBlock = typeof options.startBlock === 'undefined' ? toBlock : options.startBlock;
		}

		// If a specified subset of blocks to sync is provided
		if (typeof options.subset !== 'undefined') {

			// Return immediately if there are none
			if (options.subset.length === 0) {
				return newBlocks;
			}

			// Only sync blocks in subset range
			inRange = (n) => { return options.subset.indexOf(n) !== -1 };

			// Start iterating from minimum value of subset
			fromBlock = options.subset.sort((a, b) => { return a - b; })[0];
		}

		// Fetch block data sequentially for each block in range
		for (let n = fromBlock; n <= toBlock; n++) {

			// Skip blocks that are already synced or are out of range
			if (typeof this.blocks.ordinal[n] !== 'undefined' || !inRange(n)) {
				continue;
			}

			if (!eth || !eth.getBlock) {
				throw Error('Missing eth interface function \'getBlock\'');
			}

			// Get the block
			const block = await eth.getBlock(n);

			if (!block) {
				console.log(`Failed to get block number ${n}, stop synchronization`);
				break;
			}

			// Insert block data
			this.advance(block);

			// Save new block data for return
			newBlocks[block.number] = block;

			// Report synchronization progress
			//const remaining = toBlock - block.number;
			const iso = (new Date(block.timestamp * 1000)).toISOString();
			console.log(`Synchronized block ${block.number} @ ${iso}`);
		}

		return newBlocks; // Return new block data
	}

	// Given hash, lookup number and timestamp
	readHash (hash, confirm) {
		const n = this.blocks.nominal[hash];
		const block = this.blocks.ordinal[n];
		if (block && (!confirm || this.max.number - block.number > confirm)) {
			return { hash, number: n, timestamp: block.timestamp };
		}
	}

	// Given number, lookup hash and timestamp
	readNumber (n, confirm) {
		const block = this.blocks.ordinal[n];
		if (block && (!confirm || this.max.number - block.number > confirm)) {
			return { hash: block.hash, number: n, timestamp: block.timestamp };
		}
	}

	// Given two hashes, return block number difference
	compareHash (a, b) {
		const i = this.readHash(a);
		const f = this.readHash(b);
		return typeof i === 'undefined' || typeof f === 'undefined' ? 0 : f.number - i.number;
	}

	advance (block) {

		// Check that block has minimum required properties
		const { number, timestamp, hash, parentHash } = block;
		for (let def of [ number, timestamp, hash, parentHash ]) {
			if (typeof def === 'undefined') {
				throw Error('Block data incomplete');
			}
		}

		// Lookup the previously synced parent block, if any
		const parent = this.blocks.ordinal[number - 1];

		// Throw error if discontinuity is detected
		if (parent && parent.hash !== block.parentHash) {
			throw Error(`Inconsistency in block data at block ${number}`);
		}

		// Save block meta in two mappings: number => (timestamp, hash) 
		// and also hash => (number), allowing for quick lookup by hash
		this.blocks.nominal[hash] = number;
		this.blocks.ordinal[number] = {
			timestamp: parseInt(timestamp),
			number: parseInt(number),
			hash
		};
	}

	// Return array of blocks between specified block numbers. The
	// array can be passed back to init() to repopulate block data
	exportBlocks (range) {

		if (!this.initialized) {
			return [];
		}

		const _range = range || {};
		const _min = typeof _range.min !== 'undefined' ? _range.min : this.min.number;
		const _max = typeof _range.max !== 'undefined' ? _range.max : this.max.number;
		
		return Object.keys(this.blocks.ordinal).map(n => {
			return { ...this.blocks.ordinal[n], number: parseInt(n) };
		}).sort((a, b) => {
			return a.number - b.number;
		}).filter(({ number }) => {
			return number >= _min && number <= _max;
		});
	}

	get initialized () { // If data has been populated
		return Object.keys(this.blocks.nominal).length > 0;
	}

	get min () { // Return earliest synced block number
		return this.initialized ? this.blocks.ordinal[Object.keys(this.blocks.ordinal).reduce((a, b) => {
			return parseInt(Math.min(a, b));
		})] : null;
	}

	get max () { // Return latest sycned block number
		return this.initialized ? this.blocks.ordinal[Object.keys(this.blocks.ordinal).reduce((a, b) => {
			return parseInt(Math.max(a, b));
		})] : null;
	}
}

module.exports = Clock;
