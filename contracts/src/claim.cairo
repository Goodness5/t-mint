#[starknet::contract]
pub mod ClaimContract {
    use starknet::{
        ContractAddress, ClassHash, get_caller_address, get_block_timestamp,
        storage::{
            Map, Vec, VecTrait, MutableVecTrait, StoragePointerReadAccess,
            StoragePointerWriteAccess, StoragePathEntry, StoragePath}
    };
    use core::integer::u256;
    use core::num::traits::Zero;

    #[derive(Drop, starknet::Store)]
    struct ClaimInfo {
        amount: u256,
        used: bool,
    }

    #[storage]
    struct Storage {
        admins: Map<ContractAddress, bool>,
        token: ContractAddress,
        claim_codes: Map<felt252, ClaimInfo>,
        total_claimed: u256,
    }

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        ClaimCodeGenerated: ClaimCodeGenerated,
        TokensClaimed: TokensClaimed,
        AdminAdded: AdminAdded,
        AdminRemoved: AdminRemoved,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ClaimCodeGenerated {
        #[key]
        code: felt252,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct TokensClaimed {
        #[key]
        code: felt252,
        recipient: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AdminAdded {
        admin: ContractAddress,
        added_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AdminRemoved {
        admin: ContractAddress,
        removed_by: ContractAddress,
    }

    #[generate_trait]
    impl Internal of InternalTrait {
        fn only_admin(self: @ContractState) {
            let caller = get_caller_address();
            let is_admin = self.admins.entry(caller).read();
            assert(is_admin, 'unauthorized');
        }
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin_address: ContractAddress, token_address: ContractAddress) {
        self.admins.entry(admin_address).write(true);
        self.token.write(token_address);
        self.total_claimed.write(0_u256);
    }

    #[starknet::interface]
    pub trait IClaim<TContractState> {
        fn generate_claim_code(ref self: TContractState, code: felt252, amount: u256);
        fn add_admin(ref self: TContractState, admin: ContractAddress);
        fn remove_admin(ref self: TContractState, admin: ContractAddress);
        fn claim_tokens(ref self: TContractState, code: felt252);
        fn get_claim_code_info(self: @TContractState, code: felt252) -> (u256, bool);
        fn get_total_claimed(self: @TContractState) -> u256;
        fn is_code_used(self: @TContractState, code: felt252) -> bool;
        fn is_admin(self: @TContractState, admin: ContractAddress) -> bool;
    }

    #[abi(embed_v0)]
    impl ClaimImpl of IClaim<ContractState> {
        fn generate_claim_code(ref self: ContractState, code: felt252, amount: u256) {
            InternalTrait::only_admin(@self);
            let info = self.claim_codes.entry(code).read();
            assert(info.amount == 0_u256, 'Code already exists');
            self.claim_codes.entry(code).write(ClaimInfo { amount, used: false });
            self.emit(Event::ClaimCodeGenerated(ClaimCodeGenerated { code, amount }));
        }

        fn add_admin(ref self: ContractState, admin: ContractAddress) {
            InternalTrait::only_admin(@self);
            let caller = get_caller_address();
            assert(admin != Zero::zero(), 'Invalid admin address');
            let is_already_admin = self.admins.entry(admin).read();
            assert(!is_already_admin, 'Address is already admin');
            self.admins.entry(admin).write(true);
            self.emit(Event::AdminAdded(AdminAdded { admin, added_by: caller }));
        }

        fn remove_admin(ref self: ContractState, admin: ContractAddress) {
            InternalTrait::only_admin(@self);
            let caller = get_caller_address();
            assert(caller != admin, 'Cannot remove self');
            let is_admin = self.admins.entry(admin).read();
            assert(is_admin, 'Address is not admin');
            self.admins.entry(admin).write(false);
            self.emit(Event::AdminRemoved(AdminRemoved { admin, removed_by: caller }));
        }

        fn claim_tokens(ref self: ContractState, code: felt252) {
            let caller = get_caller_address();
            let info = self.claim_codes.entry(code).read();
            assert(info.amount != 0_u256, 'Invalid claim code');
            assert(!info.used, 'Code already used');
            self.claim_codes.entry(code).write(ClaimInfo { amount: info.amount, used: true });
            let current_total = self.total_claimed.read();
            self.total_claimed.write(current_total + info.amount);
            let token = self.token.read();
            let success = IERC20Dispatcher { contract_address: token }.transfer(caller, info.amount);
            assert(success, 'Token transfer failed');
            self.emit(Event::TokensClaimed(TokensClaimed { code, recipient: caller, amount: info.amount }));
        }

        fn get_claim_code_info(self: @ContractState, code: felt252) -> (u256, bool) {
            let info = self.claim_codes.entry(code).read();
            (info.amount, info.used)
        }

        fn get_total_claimed(self: @ContractState) -> u256 {
            self.total_claimed.read()
        }

        fn is_code_used(self: @ContractState, code: felt252) -> bool {
            let info = self.claim_codes.entry(code).read();
            info.used
        }

        fn is_admin(self: @ContractState, admin: ContractAddress) -> bool {
            self.admins.entry(admin).read()
        }
    }
}