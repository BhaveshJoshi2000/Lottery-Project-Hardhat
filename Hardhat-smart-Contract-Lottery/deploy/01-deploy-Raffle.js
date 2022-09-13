const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2address, subscriptionId

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2address = vrfCoordinatorV2Mock.address

        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)

        subscriptionId = transactionReceipt.events[0].args.subId

        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfCoordinatorV2address = networkConfig.chainId["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const gasLane = networkConfig[chainId]["gasLane"]
    const enteranceFee = networkConfig[chainId]["raffleEntranceFee"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["keepersUpdateInterval"]
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: [
            vrfCoordinatorV2address,
            enteranceFee,
            gasLane,
            subscriptionId,
            callbackGasLimit,
            interval,
        ],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
}

module.exports.tag = ["all", "raffle"]
