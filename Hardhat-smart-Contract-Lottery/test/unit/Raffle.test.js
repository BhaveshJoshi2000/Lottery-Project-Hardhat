const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Test", function () {
          let raffle, vrfCoordinatorV2Mock, deployer, interval, raffleEntranceFee
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])

              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              raffleEntranceFee = await raffle.getEntranceFee() // you have a typo in your Raffle.sol -- I have decided to keep it the same here
              interval = await raffle.getInterval()
          })

          describe("constructor", function () {
              it("initializes the raffle correctly", async function () {
                  const raffleState = (await raffle.getRaffleState()).toString()
                  assert.equal(raffleState, "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["keepersUpdateInterval"])
              })
          })

          describe("enterRaffle", async function () {
              it("reverts when entrance fee is not enough", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      "Not_Enough_Eth_To_Participate"
                  )
              })

              it("records the players when entered", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })

                  const playerFromContract = await raffle.getPlayer(0)

                  assert.equal(playerFromContract, deployer)
              })

              it("emits event when player enters", async function () {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "raffleEnter"
                  )
              })

              it("reverts when raffle is calculating", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await ethers.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await ethers.provider.send("evm_mine", [])

                  await raffle.performUpkeep([])
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__NotOpen"
                  )
              })
          })

          describe("checkUpkeep", async function () {
              it("returns false when people havent send any eth", async function () {
                  await ethers.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await ethers.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

                  assert(!upkeepNeeded)
              })

              it("returns false when raffle is not open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await ethers.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await ethers.provider.send("evm_mine", [])
                  await raffle.performUpkeep([])

                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })

              it("returns true if enough time is passed,has enough ETH and Players", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await ethers.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await ethers.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

                  assert.equal(upkeepNeeded, true)
              })
          })

          describe("performUpkeep", function () {
              it("runs only when upkeep is needed", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await ethers.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await ethers.provider.send("evm_mine", [])

                  const tx = await raffle.performUpkeep([])
                  assert(tx)
              })

              it("reverts when checkupkeep returns false", async function () {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle_UpkeepNotNeeded"
                  )
              })

              it("updates the raffle state and emits a requestId", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await ethers.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await ethers.provider.send("evm_mine", [])

                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  const raffleState = await raffle.getRaffleState()

                  const requestId = txReceipt.events[1].args.requestId
                  assert(requestId.toNumber() > 0)
                  assert(raffleState.toString() == "1")
              })
              describe("fulfill randomWords", function () {
                  beforeEach(async function () {
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                      await ethers.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                      await ethers.provider.send("evm_mine", [])
                  })

                  it("can only be called after perform upKeep", async function () {
                      await expect(
                          vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                      ).to.be.revertedWith("nonexistent request")

                      await expect(
                          vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                      ).to.be.revertedWith("nonexistent request")
                  })

                  it("picks a winner,resets the lottery and sends money", async function () {
                      const additionalEntrants = 3
                      const startingAccountIndex = 1
                      const accounts = await ethers.getSigners()

                      for (
                          let i = startingAccountIndex;
                          i < startingAccountIndex + additionalEntrants;
                          i++
                      ) {
                          const accountConnectedRaffle = await raffle.connect(accounts[i])
                          await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
                      }
                      const startingTimestamp = await raffle.getPreviousTimeStamp()

                      await new Promise(async (resolve, reject) => {
                          raffle.once("WinnerPicked", async () => {
                              console.log("found the event!")
                              try {
                                  const recentWinner = await raffle.getRecentWinner()
                                  const raffleState = await raffle.getRaffleState()
                                  const endingTimeStamp = await raffle.getPreviousTimeStamp()
                                  const numPlayers = await raffle.getNumOfPlayers()
                                  const endingWinnerBalance = await accounts[1].getBalance()

                                  assert.equal(numPlayers.toString(), "0")
                                  assert.equal(raffleState.toString(), "0")
                                  assert(endingTimeStamp > startingTimestamp)

                                  assert.equal(
                                      endingWinnerBalance.toString(),
                                      startingWinnerBalance.add(
                                          raffleEntranceFee
                                              .mul(additionalEntrants)
                                              .add(raffleEntranceFee)
                                              .toString()
                                      )
                                  )
                              } catch (e) {
                                  reject(e)
                              }
                              resolve()
                          })
                          const startingWinnerBalance = await accounts[1].getBalance()
                          const tx = await raffle.performUpkeep([])
                          const txReceipt = await tx.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              txReceipt.events[1].args.requestId,
                              raffle.address
                          )
                      })
                  })
              })
          })
      })
