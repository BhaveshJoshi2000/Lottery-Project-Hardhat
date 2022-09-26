const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Test", function () {
          let raffle, deployer, raffleEntranceFee

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer

              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntranceFee = await raffle.getEntranceFee() // you have a typo in your Raffle.sol -- I have decided to keep it the same here
          })

          describe("fulfillRandomWords", function () {
              it("works with live chainlink keepers and VRF, we get a random Winner", async function () {
                  //enter the raffle
                  const startingTimestamp = await raffle.getPreviousTimeStamp()
                  const accounts = await ethers.getSigners()

                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("Winner Picked Event Fired!")
                          try {
                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp = await raffle.getPreviousTimeStamp()
                              const numPlayers = await raffle.getNumOfPlayers()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const recentWinner = await raffle.getRecentWinner()

                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner, accounts[0].address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              )
                              assert(endingTimeStamp > startingTimestamp)
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })

                      console.log("Entering Raffle...")
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance = await accounts[0].getBalance()
                  })
              })
          })
      })
