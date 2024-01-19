// Interest Coin with rebasing and negative interest rate functionality

module counter::interestcoin {
    use sui::transfer;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use std::option;
    use sui::coin::{Self, TreasuryCap};

    /// A shared counter.
    struct Counter has key {
        id: UID,
        owner: address,
        value: u64
    }

    struct PublicTreasury has key, store {
        id: UID,
        cap: TreasuryCap<INTERESTCOIN>
    }

    // a wrapper object around coins and interest rates
    struct WrappedCoin has key, store {
        id: UID,
        posIR: u64, // positive Interest Rate
        negIR: u64, // negative Interest Rate
        lastTimeModified: u64,
        start_time: u64,
        end_time: u64,
        original_balance: u64,
        current_balance: Balance<INTERESTCOIN>
    }

    /// Witness
    struct INTERESTCOIN has drop {}

   // Withdraw function, you get 0 if you withdraw early
   public entry fun withdraw(voucher: &mut WrappedCoin, clock: &Clock, ctx: &mut TxContext){
        let total_duration = voucher.end_time - voucher.start_time;
        let elapsed_duration = clock::timestamp_ms(clock) - voucher.start_time;
        
        
        let total_vested_amount = if (elapsed_duration > total_duration) {
            voucher.original_balance
        } else {
            0
        };
        transfer::public_transfer(coin::take(&mut voucher.current_balance, total_vested_amount, ctx), tx_context::sender(ctx));

    }

    // split and transfer wrapped versions of INTERESTCOIN
    // inputs: [coins to transfer, context]
    // effects: split the coins from wrapper, check enough, put in new wrapper and transfer that wrapper to reciever
    fun split () {
        // TODO
    }

    fun init(otw: INTERESTCOIN, ctx: &mut TxContext){
        let (treasury_cap, metadata) = coin::create_currency<INTERESTCOIN>(otw, 8, b"INTERESTCOIN", b"INTC", b"", option::none(), ctx);
        transfer::public_freeze_object(metadata);

        let pt = PublicTreasury {
            id : object::new(ctx),
            cap : treasury_cap
        };

        // share the object with the treasury cap to everyone
        transfer::share_object(pt);
    }


    //mint and lock away coins
    public entry fun locked_mint(pt: &mut PublicTreasury, amount: u64, lock_up_duration: u64, clock: &Clock, posRate : u64, negRate : u64, ctx: &mut TxContext){
        
        let coin = coin::mint(&mut pt.cap, amount, ctx);
        let start_date = clock::timestamp_ms(clock);
        let final_date = start_date + lock_up_duration;

        transfer::public_transfer(WrappedCoin {
            id: object::new(ctx),
            posIR : posRate, // one of the rates is 0, and the other is the true rate
            negIR : negRate, // for example, if posIR is 0, then the interest rate is - negIR (because u64s are always positive)
            lastTimeModified : start_date,
            start_time : start_date,
            end_time : final_date,
            original_balance : amount,
            current_balance: coin::into_balance(coin)
        },tx_context::sender(ctx));
    }

    

    //taylor rule: federalfundsrate = realneutralrate + expectedinflationrate + (0.5) * (expectedrealgdp - trendrealgdp) + (0.5) * (expectedinflationrate - targetinflationratet)
    public entry fun rebase(clock: &Clock, pt : &mut PublicTreasury, voucher: &mut WrappedCoin, ctx: &mut TxContext) {
        let lastTime = voucher.lastTimeModified;
        let currentTime = clock::timestamp_ms(clock);
        let timeElapsed = currentTime - lastTime;
        
        let newVal = if (voucher.negIR == 0) {
            voucher.original_balance + (voucher.original_balance / 90000) * voucher.posIR * timeElapsed
        } else {
            voucher.original_balance - (voucher.original_balance / 90000) * voucher.negIR * timeElapsed
        };

        // either burn or mint coins, depending on the interest rate
        if (newVal > voucher.original_balance) {
            let amountToMint = newVal - voucher.original_balance;
            let interest = coin::mint(&mut pt.cap, amountToMint, ctx);
            balance::join(&mut voucher.current_balance, coin::into_balance(interest));
        } else {
            let amountToBurn = voucher.original_balance - newVal;
            let balanceToBurn = balance::split(&mut voucher.current_balance, amountToBurn);
            coin::burn(&mut pt.cap, coin::from_balance(balanceToBurn, ctx));
        };
    }

    // //loop through list of everyone with the wrapper
    // public fun everyoneRebase() {
        
    // }

    public fun owner(counter: &Counter): address {
        counter.owner
    }

    public fun value(counter: &Counter): u64 {
        counter.value
    }

    /// Create and share a Counter object.
    public fun create(ctx: &mut TxContext) {
        transfer::share_object(Counter {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            value: 0
        })
    }

    /// Increment a counter by 1.
    public fun increment(counter: &mut Counter) {
        counter.value = counter.value + 1;
    }

    /// Set value (only runnable by the Counter owner)
    public fun set_value(counter: &mut Counter, value: u64, ctx: &TxContext) {
        assert!(counter.owner == tx_context::sender(ctx), 0);
        counter.value = value;
    }

    /// Assert a value for the counter.
    public fun assert_value(counter: &Counter, value: u64) {
        assert!(counter.value == value, 0)
    }
}
