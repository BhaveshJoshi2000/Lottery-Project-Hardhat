const { assert } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Test", async function () {
          let raffle, vrfCoordinatorV2Mock, depolyer
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              console.log(deployer)
              await deployments.fixture(["all"])

              raffle = await ethers.getContract("Raffle", deployer)
              console.log(raffle)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
          })

          describe("constructor", async function () {
              it("initializes the raffle correctly", async function () {
                  const raffleState = raffle.getRaffleState()
                  const interval = raffle.getInterval()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["keepersUpdateInterval"])
              })
          })
      })

// const { assert, expect } = require("chai")
// const { network, deployments, ethers } = require("hardhat")
// const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

// !developmentChains.includes(network.name)
//     ? describe.skip
//     : describe("Raffle Unit Tests", function () {
//           let raffle, raffleContract, vrfCoordinatorV2Mock, raffleEntranceFee, interval, player // , deployer

//           beforeEach(async () => {
//               console.log(network.name)
//               accounts = await ethers.getSigners() // could also do with getNamedAccounts
//               //   deployer = accounts[0]
//               player = accounts[1]
//               await deployments.fixture(["mocks", "raffle"]) // Deploys modules with the tags "mocks" and "raffle"
//               vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock") // Returns a new connection to the VRFCoordinatorV2Mock contract
//               raffleContract = await ethers.getContract("Raffle") // Returns a new connection to the Raffle contract
//               raffle = raffleContract.connect(player) // Returns a new instance of the Raffle contract connected to player
//               raffleEntranceFee = await raffle.getEntranceFee()
//               interval = await raffle.getInterval()
//           })

//           describe("constructor", function () {
//               it("initializes the raffle correctly", async () => {
//                   // Ideally, we'd separate these out so that only 1 assert per "it" block
//                   // And ideally, we'd make this check everything
//                   const raffleState = (await raffle.getRaffleState()).toString()
//                   // Comparisons for Raffle initialization:
//                   assert.equal(raffleState, "0")
//                   assert.equal(
//                       interval.toString(),
//                       networkConfig[network.config.chainId]["keepersUpdateInterval"]
//                   )
//               })
//           })
//       })
