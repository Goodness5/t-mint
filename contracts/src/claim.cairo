// Core Library Imports
use starknet::ContractAddress;
use core::integer::u256;
use core::num::traits::Zero;

// Define the contract interface
#[starknet::interface]
pub trait IClaim<TContractState> {
    // Public functions
    fn claim_tokens(ref self: TContractState, code: felt252, amount: u256, proof: Span<felt252>);
    fn get_merkle_root(self: @TContractState) -> felt252;
    fn get_total_claimed(self: @TContractState) -> u256;
    fn is_leaf_claimed(self: @TContractState, leaf_hash: felt252) -> bool;
    fn is_code_claimed(self: @TContractState, code: felt252, amount: u256) -> bool;
    fn is_admin(self: @TContractState, address: ContractAddress) -> bool;
    fn get_admin_count(self: @TContractState) -> u32;
    
    // Admin functions
    fn set_merkle_root(ref self: TContractState, new_root: felt252);
    fn add_admin(ref self: TContractState, admin_address: ContractAddress);
    fn remove_admin(ref self: TContractState, admin_address: ContractAddress);
    fn pause_contract(ref self: TContractState);
    fn unpause_contract(ref self: TContractState);
    fn set_token_address(ref self: TContractState, new_token: ContractAddress);
    fn withdraw_tokens(ref self: TContractState, amount: u256);
    fn withdraw_all_tokens(ref self: TContractState);
    fn reset_campaign(ref self: TContractState);
    fn emergency_withdraw(ref self: TContractState);
}

#[starknet::contract]
pub mod ClaimContract {
    use starknet::{
        ContractAddress, get_caller_address,
        storage::{
            Map,
            StoragePointerReadAccess,
            StoragePointerWriteAccess,
            StorageMapReadAccess,
            StorageMapWriteAccess,
            StoragePathEntry,
        },
    };
    use core::integer::u256;
    use core::array::ArrayTrait;
    use core::hash::{HashStateExTrait, HashStateTrait};
    use core::poseidon::PoseidonTrait;
    use core::num::traits::Zero;
    use openzeppelin::access::ownable::{OwnableComponent, OwnableComponent::InternalTrait};
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin::merkle_tree::merkle_proof;

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    // Internal impl for Ownable
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // Modifier to check if caller is admin
    fn only_admin(self: @ContractState) {
        let caller = get_caller_address();
        assert!(self.admins.entry(caller).read(), "Caller is not an admin");
    }

    // Custom Poseidon-based Merkle proof verification with commutative hashing
    fn verify_poseidon_proof(proof: Span<felt252>, root: felt252, leaf: felt252) -> bool {
        let mut current_hash = leaf;
        let mut proof_index = 0;
        
        while proof_index < proof.len() {
            let proof_element = *proof.at(proof_index);
            
            // Use commutative hashing: always hash the smaller value first
            // Convert to u256 for comparison since u256 supports PartialOrd
            let current_u256: u256 = current_hash.into();
            let proof_u256: u256 = proof_element.into();
            
            let mut hash_state = PoseidonTrait::new();
            if current_u256 <= proof_u256 {
                hash_state = hash_state.update_with(current_hash);
                hash_state = hash_state.update_with(proof_element);
            } else {
                hash_state = hash_state.update_with(proof_element);
                hash_state = hash_state.update_with(current_hash);
            }
            current_hash = hash_state.finalize();
            
            proof_index += 1;
        }
        
        current_hash == root
    }

    #[storage]
    pub struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        token: ContractAddress,
        merkle_root: felt252,
        claimed_leaves: Map<felt252, bool>,
        total_claimed: u256,
        admins: Map<ContractAddress, bool>,
        admin_count: u32,
        paused: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        MerkleRootUpdated: MerkleRootUpdated,
        TokensClaimed: TokensClaimed,
        AdminAdded: AdminAdded,
        AdminRemoved: AdminRemoved,
        ContractPaused: ContractPaused,
        ContractUnpaused: ContractUnpaused,
        TokenAddressUpdated: TokenAddressUpdated,
        TokensWithdrawn: TokensWithdrawn,
        CampaignReset: CampaignReset,
        EmergencyWithdraw: EmergencyWithdraw,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MerkleRootUpdated {
        #[key]
        old_root: felt252,
        #[key]
        new_root: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct TokensClaimed {
        #[key]
        leaf_hash: felt252,
        claim_code: felt252,
        recipient: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AdminAdded {
        #[key]
        admin: ContractAddress,
        #[key]
        added_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AdminRemoved {
        #[key]
        admin: ContractAddress,
        #[key]
        removed_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ContractPaused {
        #[key]
        admin: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ContractUnpaused {
        #[key]
        admin: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct TokenAddressUpdated {
        #[key]
        old_token: ContractAddress,
        #[key]
        new_token: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct TokensWithdrawn {
        #[key]
        admin: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CampaignReset {
        #[key]
        admin: ContractAddress,
        old_root: felt252,
        new_root: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct EmergencyWithdraw {
        #[key]
        admin: ContractAddress,
        amount: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner_address: ContractAddress, token_address: ContractAddress, initial_merkle_root: felt252) {
        self.ownable.initializer(owner_address);
        self.token.write(token_address);
        self.merkle_root.write(initial_merkle_root);
        self.total_claimed.write(Zero::zero());
        self.paused.write(false);
        self.admin_count.write(0);
        
        // Add owner as first admin
        self.admins.entry(owner_address).write(true);
        self.admin_count.write(1);
    }

    #[abi(embed_v0)]
    pub impl ClaimImpl of super::IClaim<ContractState> {
        fn set_merkle_root(ref self: ContractState, new_root: felt252) {
            only_admin(@self);
            let old_root = self.merkle_root.read();
            self.merkle_root.write(new_root);
            self.emit(Event::MerkleRootUpdated(MerkleRootUpdated { old_root, new_root }));
        }

        fn claim_tokens(ref self: ContractState, code: felt252, amount: u256, proof: Span<felt252>) {
            // Check if contract is not paused
            assert!(!self.paused.read(), "Contract is paused");
            
            let caller = get_caller_address();

            let mut hash_state = PoseidonTrait::new();
            hash_state = hash_state.update_with(code);
            hash_state = hash_state.update_with(amount.low);
            hash_state = hash_state.update_with(amount.high);
            let leaf_hash = hash_state.finalize();

            let claimed = self.claimed_leaves.entry(leaf_hash).read();
            assert!(!claimed, "Code already used");

            let current_merkle_root = self.merkle_root.read();
            assert!(!current_merkle_root.is_zero(), "Merkle root not set");

            // Custom Poseidon-based proof verification to match our frontend
            let is_valid_proof = verify_poseidon_proof(proof, current_merkle_root, leaf_hash);
            assert!(is_valid_proof, "Invalid Merkle proof for code");

            self.claimed_leaves.entry(leaf_hash).write(true);

            let token = self.token.read();
            let dispatcher = IERC20Dispatcher { contract_address: token };
            let success = IERC20DispatcherTrait::transfer(dispatcher, caller, amount);
            assert!(success, "Token transfer failed");

            let current_total = self.total_claimed.read();
            self.total_claimed.write(current_total + amount);

            self.emit(Event::TokensClaimed(TokensClaimed { leaf_hash, claim_code: code, recipient: caller, amount }));
        }

        fn get_merkle_root(self: @ContractState) -> felt252 {
            self.merkle_root.read()
        }

        fn get_total_claimed(self: @ContractState) -> u256 {
            self.total_claimed.read()
        }

        fn is_leaf_claimed(self: @ContractState, leaf_hash: felt252) -> bool {
            self.claimed_leaves.entry(leaf_hash).read()
        }

        fn is_code_claimed(self: @ContractState, code: felt252, amount: u256) -> bool {
            let mut hash_state = PoseidonTrait::new();
            hash_state = hash_state.update_with(code);
            hash_state = hash_state.update_with(amount.low);
            hash_state = hash_state.update_with(amount.high);
            let leaf_hash = hash_state.finalize();
            self.claimed_leaves.entry(leaf_hash).read()
        }

        fn is_admin(self: @ContractState, address: ContractAddress) -> bool {
            self.admins.entry(address).read()
        }

        fn get_admin_count(self: @ContractState) -> u32 {
            self.admin_count.read()
        }

        // Admin management functions
        fn add_admin(ref self: ContractState, admin_address: ContractAddress) {
            self.ownable.assert_only_owner();
            let caller = get_caller_address();
            
            // Check if address is already an admin
            assert!(!self.admins.entry(admin_address).read(), "Address is already an admin");
            
            self.admins.entry(admin_address).write(true);
            let current_count = self.admin_count.read();
            self.admin_count.write(current_count + 1);
            
            self.emit(Event::AdminAdded(AdminAdded { admin: admin_address, added_by: caller }));
        }

        fn remove_admin(ref self: ContractState, admin_address: ContractAddress) {
            self.ownable.assert_only_owner();
            let caller = get_caller_address();
            
            // Check if address is an admin
            assert!(self.admins.entry(admin_address).read(), "Address is not an admin");
            
            // Prevent removing the last admin
            let current_count = self.admin_count.read();
            assert!(current_count > 1, "Cannot remove the last admin");
            
            self.admins.entry(admin_address).write(false);
            self.admin_count.write(current_count - 1);
            
            self.emit(Event::AdminRemoved(AdminRemoved { admin: admin_address, removed_by: caller }));
        }

        // Admin functions
        fn pause_contract(ref self: ContractState) {
            only_admin(@self);
            self.paused.write(true);
            self.emit(Event::ContractPaused(ContractPaused { admin: get_caller_address() }));
        }

        fn unpause_contract(ref self: ContractState) {
            only_admin(@self);
            self.paused.write(false);
            self.emit(Event::ContractUnpaused(ContractUnpaused { admin: get_caller_address() }));
        }

        fn set_token_address(ref self: ContractState, new_token: ContractAddress) {
            only_admin(@self);
            let old_token = self.token.read();
            self.token.write(new_token);
            self.emit(Event::TokenAddressUpdated(TokenAddressUpdated { old_token, new_token }));
        }

        fn withdraw_tokens(ref self: ContractState, amount: u256) {
            only_admin(@self);
            let caller = get_caller_address();
            let token = self.token.read();
            let dispatcher = IERC20Dispatcher { contract_address: token };
            let success = IERC20DispatcherTrait::transfer(dispatcher, caller, amount);
            assert!(success, "Token withdrawal failed");
            self.emit(Event::TokensWithdrawn(TokensWithdrawn { admin: caller, amount }));
        }

        fn withdraw_all_tokens(ref self: ContractState) {
            only_admin(@self);
            let caller = get_caller_address();
            let token = self.token.read();
            let dispatcher = IERC20Dispatcher { contract_address: token };
            let balance = IERC20DispatcherTrait::balance_of(dispatcher, starknet::contract_address_const::<0x0>());
            let success = IERC20DispatcherTrait::transfer(dispatcher, caller, balance);
            assert!(success, "Token withdrawal failed");
            self.emit(Event::TokensWithdrawn(TokensWithdrawn { admin: caller, amount: balance }));
        }

        fn reset_campaign(ref self: ContractState) {
            only_admin(@self);
            let caller = get_caller_address();
            let old_root = self.merkle_root.read();
            let new_root = Zero::zero();
            self.merkle_root.write(new_root);
            self.total_claimed.write(Zero::zero());
            self.emit(Event::CampaignReset(CampaignReset { admin: caller, old_root, new_root }));
        }

        fn emergency_withdraw(ref self: ContractState) {
            only_admin(@self);
            let caller = get_caller_address();
            let token = self.token.read();
            let dispatcher = IERC20Dispatcher { contract_address: token };
            let balance = IERC20DispatcherTrait::balance_of(dispatcher, starknet::contract_address_const::<0x0>());
            let success = IERC20DispatcherTrait::transfer(dispatcher, caller, balance);
            assert!(success, "Emergency withdrawal failed");
            self.emit(Event::EmergencyWithdraw(EmergencyWithdraw { admin: caller, amount: balance }));
        }
    }
}