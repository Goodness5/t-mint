#[cfg(test)]
mod tests {
    use contracts::claim::ClaimContract;
    use contracts::claim::ClaimContract::{IClaimDispatcher, IClaimDispatcherTrait};
    use starknet::{ContractAddress, contract_address_const};
    use snforge_std::{
        declare, ContractClassTrait, spy_events, EventSpy,
        start_cheat_caller_address, stop_cheat_caller_address, expect_revert
    };
    use core::integer::u256;
    use core::array::ArrayTrait;

    // Mock ERC20 contract for testing token transfers
    #[starknet::interface]
    trait IERC20Mock<TContractState> {
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    }

    #[starknet::contract]
    mod ERC20Mock {
        use starknet::{ContractAddress, get_caller_address, storage::Map};
        use core::integer::u256;

        #[storage]
        struct Storage {
            balances: Map<ContractAddress, u256>,
        }

        #[external(v0)]
        impl ERC20MockImpl of super::IERC20Mock<ContractState> {
            fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
                let caller = get_caller_address();
                let caller_balance = self.balances.entry(caller).read();
                assert(caller_balance >= amount, 'Insufficient balance');
                self.balances.entry(caller).write(caller_balance - amount);
                self.balances.entry(recipient).write(self.balances.entry(recipient).read() + amount);
                true
            }
        }
    }

    // Helper function to deploy the contracts
    fn setup() -> (IClaimDispatcher, ContractAddress, ContractAddress) {
        // Declare and deploy ERC20Mock
        let erc20_class = declare("ERC20Mock").unwrap();
        let (erc20_address, _) = erc20_class.deploy(@ArrayTrait::new()).unwrap();

        // Declare and deploy ClaimContract
        let initial_admin = contract_address_const::<0x1>();
        let claim_class = declare("ClaimContract").unwrap();
        let mut calldata = ArrayTrait::new();
        calldata.append(initial_admin.into());
        calldata.append(erc20_address.into());
        let (claim_address, _) = claim_class.deploy(@calldata).unwrap();

        // Set initial balance for token contract
        let erc20_dispatcher = IERC20MockDispatcher { contract_address: erc20_address };
        start_cheat_caller_address(erc20_address, initial_admin);
        erc20_dispatcher.transfer(claim_address, u256 { low: 1000, high: 0 });
        stop_cheat_caller_address(erc20_address);

        (IClaimDispatcher { contract_address: claim_address }, initial_admin, erc20_address)
    }

    #[test]
    fn test_constructor() {
        let (claim, initial_admin, _) = setup();
        assert(claim.is_admin(initial_admin), 'Initial admin not set');
        assert(claim.get_total_claimed() == u256 { low: 0, high: 0 }, 'Total claimed not zero');
    }

    #[test]
    fn test_add_admin_success() {
        let (claim, initial_admin, _) = setup();
        let new_admin = contract_address_const::<0x2>();

        start_cheat_caller_address(claim.contract_address, initial_admin);
        claim.add_admin(new_admin);
        stop_cheat_caller_address(claim.contract_address);

        assert(claim.is_admin(new_admin), 'New admin not added');
    }

    #[test]
    fn test_add_admin_non_admin_fails() {
        let (claim, _, _) = setup();
        let non_admin = contract_address_const::<0x3>();
        start_cheat_caller_address(claim.contract_address, non_admin);
        expect_revert('unauthorized');
        claim.add_admin(contract_address_const::<0x2>());
        stop_cheat_caller_address(claim.contract_address);
    }

    #[test]
    fn test_add_admin_already_admin_fails() {
        let (claim, initial_admin, _) = setup();
        start_cheat_caller_address(claim.contract_address, initial_admin);
        expect_revert('Address is already admin');
        claim.add_admin(initial_admin);
        stop_cheat_caller_address(claim.contract_address);
    }

    #[test]
    fn test_add_admin_zero_address_fails() {
        let (claim, initial_admin, _) = setup();
        start_cheat_caller_address(claim.contract_address, initial_admin);
        expect_revert('Invalid admin address');
        claim.add_admin(contract_address_const::<0>());
        stop_cheat_caller_address(claim.contract_address);
    }

    #[test]
    fn test_remove_admin_success() {
        let (claim, initial_admin, _) = setup();
        let new_admin = contract_address_const::<0x2>();

        // Add new admin first
        start_cheat_caller_address(claim.contract_address, initial_admin);
        claim.add_admin(new_admin);

        // Remove new admin
        claim.remove_admin(new_admin);
        stop_cheat_caller_address(claim.contract_address);

        assert(!claim.is_admin(new_admin), 'Admin not removed');
    }

    #[test]
    fn test_remove_admin_non_admin_fails() {
        let (claim, initial_admin, _) = setup();
        let non_admin = contract_address_const::<0x3>();
        start_cheat_caller_address(claim.contract_address, non_admin);
        expect_revert('unauthorized');
        claim.remove_admin(initial_admin);
        stop_cheat_caller_address(claim.contract_address);
    }

    #[test]
    fn test_remove_admin_self_fails() {
        let (claim, initial_admin, _) = setup();
        start_cheat_caller_address(claim.contract_address, initial_admin);
        expect_revert('Cannot remove self');
        claim.remove_admin(initial_admin);
        stop_cheat_caller_address(claim.contract_address);
    }

    #[test]
    fn test_remove_admin_not_admin_fails() {
        let (claim, initial_admin, _) = setup();
        let non_admin = contract_address_const::<0x3>();
        start_cheat_caller_address(claim.contract_address, initial_admin);
        expect_revert('Address is not admin');
        claim.remove_admin(non_admin);
        stop_cheat_caller_address(claim.contract_address);
    }

    #[test]
    fn test_generate_claim_code_success() {
        let (claim, initial_admin, _) = setup();
        let code = 1234_felt252;
        let amount = u256 { low: 100, high: 0 };

        start_cheat_caller_address(claim.contract_address, initial_admin);
        claim.generate_claim_code(code, amount);
        stop_cheat_caller_address(claim.contract_address);

        let (claim_amount, used) = claim.get_claim_code_info(code);
        assert(claim_amount == amount, 'Claim amount incorrect');
        assert(!used, 'Claim code should not be used');
    }

    #[test]
    fn test_generate_claim_code_non_admin_fails() {
        let (claim, _, _) = setup();
        let non_admin = contract_address_const::<0x3>();
        start_cheat_caller_address(claim.contract_address, non_admin);
        expect_revert('unauthorized');
        claim.generate_claim_code(1234_felt252, u256 { low: 100, high: 0 });
        stop_cheat_caller_address(claim.contract_address);
    }

    #[test]
    fn test_generate_claim_code_already_exists_fails() {
        let (claim, initial_admin, _) = setup();
        let code = 1234_felt252;
        let amount = u256 { low: 100, high: 0 };

        start_cheat_caller_address(claim.contract_address, initial_admin);
        claim.generate_claim_code(code, amount);
        expect_revert('Code already exists');
        claim.generate_claim_code(code, amount);
        stop_cheat_caller_address(claim.contract_address);
    }

    #[test]
    fn test_claim_tokens_success() {
        let (claim, initial_admin, _) = setup();
        let code = 1234_felt252;
        let amount = u256 { low: 100, high: 0 };
        let user = contract_address_const::<0x4>();

        // Generate claim code
        start_cheat_caller_address(claim.contract_address, initial_admin);
        claim.generate_claim_code(code, amount);
        stop_cheat_caller_address(claim.contract_address);

        // Claim tokens
        start_cheat_caller_address(claim.contract_address, user);
        claim.claim_tokens(code);
        stop_cheat_caller_address(claim.contract_address);

        let (claim_amount, used) = claim.get_claim_code_info(code);
        assert(claim_amount == amount, 'Claim amount incorrect');
        assert(used, 'Claim code should be used');
        assert(claim.get_total_claimed() == amount, 'Total claimed incorrect');
        assert(claim.is_code_used(code), 'Code should be used');
    }

    #[test]
    fn test_claim_tokens_invalid_code_fails() {
        let (claim, _, _) = setup();
        let user = contract_address_const::<0x4>();
        start_cheat_caller_address(claim.contract_address, user);
        expect_revert('Invalid claim code');
        claim.claim_tokens(1234_felt252);
        stop_cheat_caller_address(claim.contract_address);
    }

    #[test]
    fn test_claim_tokens_already_used_fails() {
        let (claim, initial_admin, _) = setup();
        let code = 1234_felt252;
        let amount = u256 { low: 100, high: 0 };
        let user = contract_address_const::<0x4>();

        // Generate claim code
        start_cheat_caller_address(claim.contract_address, initial_admin);
        claim.generate_claim_code(code, amount);
        stop_cheat_caller_address(claim.contract_address);

        // Claim tokens once
        start_cheat_caller_address(claim.contract_address, user);
        claim.claim_tokens(code);

        // Try to claim again
        expect_revert('Code already used');
        claim.claim_tokens(code);
        stop_cheat_caller_address(claim.contract_address);
    }

    #[test]
    fn test_get_claim_code_info() {
        let (claim, initial_admin, _) = setup();
        let code = 1234_felt252;
        let amount = u256 { low: 100, high: 0 };

        // Check non-existent code
        let (claim_amount, used) = claim.get_claim_code_info(code);
        assert(claim_amount == u256 { low: 0, high: 0 }, 'Non-existent code amount incorrect');
        assert(!used, 'Non-existent code should not be used');

        // Generate claim code
        start_cheat_caller_address(claim.contract_address, initial_admin);
        claim.generate_claim_code(code, amount);
        stop_cheat_caller_address(claim.contract_address);

        // Check existent code
        let (claim_amount, used) = claim.get_claim_code_info(code);
        assert(claim_amount == amount, 'Claim amount incorrect');
        assert(!used, 'Claim code should not be used');
    }

    #[test]
    fn test_get_total_claimed() {
        let (claim, initial_admin, _) = setup();
        let code = 1234_felt252;
        let amount = u256 { low: 100, high: 0 };
        let user = contract_address_const::<0x4>();

        assert(claim.get_total_claimed() == u256 { low: 0, high: 0 }, 'Initial total claimed incorrect');

        // Generate and claim code
        start_cheat_caller_address(claim.contract_address, initial_admin);
        claim.generate_claim_code(code, amount);
        stop_cheat_caller_address(claim.contract_address);

        start_cheat_caller_address(claim.contract_address, user);
        claim.claim_tokens(code);
        stop_cheat_caller_address(claim.contract_address);

        assert(claim.get_total_claimed() == amount, 'Total claimed incorrect');
    }

    #[test]
    fn test_is_code_used() {
        let (claim, initial_admin, _) = setup();
        let code = 1234_felt252;
        let amount = u256 { low: 100, high: 0 };
        let user = contract_address_const::<0x4>();

        assert(!claim.is_code_used(code), 'Non-existent code should not be used');

        // Generate claim code
        start_cheat_caller_address(claim.contract_address, initial_admin);
        claim.generate_claim_code(code, amount);
        stop_cheat_caller_address(claim.contract_address);

        assert(!claim.is_code_used(code), 'Generated code should not be used');

        // Claim tokens
        start_cheat_caller_address(claim.contract_address, user);
        claim.claim_tokens(code);
        stop_cheat_caller_address(claim.contract_address);

        assert(claim.is_code_used(code), 'Claimed code should be used');
    }

    #[test]
    fn test_is_admin() {
        let (claim, initial_admin, _) = setup();
        let non_admin = contract_address_const::<0x3>();

        assert(claim.is_admin(initial_admin), 'Initial admin not recognized');
        assert(!claim.is_admin(non_admin), 'Non-admin incorrectly recognized');
    }
}