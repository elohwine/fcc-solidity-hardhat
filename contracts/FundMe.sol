// SPDX-License-Identifier: MIT
// license 1st
pragma solidity ^0.8.8;
//imports 2nd
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

//errors 3rd
error FundMe_NotOwner(); //convension is to put name of contact_error name

//intefaces 3rd
//libraries 4th
//contracts 5th
contract FundMe {
    //type declarations 6th,if any
    using PriceConverter for uint256;

    //state/storage variables 7th
    mapping(address => uint256) public s_addressToAmountFunded;
    address[] public s_funders;
    // Could we make this constant?  /* hint: no! We should make it immutable! */
    address public immutable i_owner;
    uint256 public constant MINIMUM_USD = 50 * 10**18;
    AggregatorV3Interface public s_priceFeed;

    //events 8th
    modifier onlyOwner() {
        //require(i_owner == _owner,"No owner of contract");
        if (msg.sender != i_owner) revert FundMe_NotOwner();
        _;
    }

    //functions last,
    //with constructor 1st
    constructor(address aggregatorV3InterfaceAddress) payable {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(aggregatorV3InterfaceAddress);
    }

    //receive 2nd
    receive() external payable {
        fund();
    }

    //fallback 3rd
    fallback() external payable {
        fund();
    }

    function fund() public payable {
        require(
            msg.value.getConversionRate(s_priceFeed) >= MINIMUM_USD,
            "You need to spend more ETH shaa!"
        );
        // require(PriceConverter.getConversionRate(msg.value) >= MINIMUM_USD, "You need to spend more ETH!");
        s_addressToAmountFunded[msg.sender] += msg.value;
        s_funders.push(msg.sender);
    }

    function withdraw() public payable onlyOwner {
        //clear all funder address balances and reset the array
        for (uint256 i = 0; i < s_funders.length; i++) {
            address funder = s_funders[i];
            s_addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);

        /*using transfer to send,throws an error and reverts
        payable(msg.sender).transfer(address(this).balance);

        //using send to send eth,,returns a bool and reverts
        bool hasSent = payable(msg.sender).send(address(this).balance);
        require(hasSent, "Send failed");*/

        //using call to send,recommended uses less eth
        (bool hasCalled, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(hasCalled, "Call failed");
    }
}
 