// Copyright 2025, ArbiPic
// For licensing, see MIT OR Apache-2.0

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]

#[cfg(not(any(test, feature = "export-abi")))]
#[no_mangle]
pub extern "C" fn main() {}

#[cfg(feature = "export-abi")]
fn main() {
    arbipic_verifier::print_from_args();
}
