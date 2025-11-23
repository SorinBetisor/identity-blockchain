// import { expect } from "chai";
// import hre from "hardhat";
// import { getAddress, parseGwei, keccak256, encodeAbiParameters } from "viem";

// describe("ConsentManager", function () {
//   async function deployConsentManagerFixture() {
//     const [owner, user, requester, otherAccount] = await hre.viem.getWalletClients();

//     const consentManager = await hre.viem.deployContract("ConsentManager");

//     const publicClient = await hre.viem.getPublicClient();

//     return {
//       consentManager,
//       owner,
//       user,
//       requester,
//       otherAccount,
//       publicClient,
//     };
//   }

//   // Consent status enum values
//   const ConsentStatus = {
//     None: 0,
//     Granted: 1,
//     Requested: 2,
//     Revoked: 3,
//     Expired: 4,
//   };

//   describe("Deployment", function () {
//     it("Should deploy successfully", async function () {
//       const { consentManager } = await deployConsentManagerFixture();
//       expect(consentManager.address).to.be.properAddress;
//     });
//   });

//   describe("createConsent", function () {
//     it("Should create a consent request successfully", async function () {
//       const { consentManager, user, requester, publicClient } = await deployConsentManagerFixture();
      
//       const currentBlock = await publicClient.getBlock();
//       const startDate = currentBlock.timestamp + 100n;
//       const endDate = currentBlock.timestamp + 86400n;

//       const hash = await consentManager.write.createConsent(
//         [requester.account.address, user.account.address, startDate, endDate],
//         { account: user.account }
//       );

//       await publicClient.waitForTransactionReceipt({ hash });

//       // Verify consent was created
//       const consentID = keccak256(
//         encodeAbiParameters(
//           [{ type: 'address' }, { type: 'address' }],
//           [requester.account.address, user.account.address]
//         )
//       );

//       const consent = await consentManager.read.consents([user.account.address, consentID]);
//       expect(consent[0]).to.equal(consentID); // consentID
//       expect(consent[1].toLowerCase()).to.equal(requester.account.address.toLowerCase()); // requesterDID
//       expect(consent[2]).to.equal(ConsentStatus.Requested); // status
//       expect(consent[3]).to.equal(startDate); // startDate
//       expect(consent[4]).to.equal(endDate); // endDate
//     });

//     it("Should fail if not called by the user (owner)", async function () {
//       const { consentManager, user, requester, publicClient } = await deployConsentManagerFixture();
      
//       const currentBlock = await publicClient.getBlock();
//       const startDate = currentBlock.timestamp + 100n;
//       const endDate = currentBlock.timestamp + 86400n;

//       await expect(
//         consentManager.write.createConsent(
//           [requester.account.address, user.account.address, startDate, endDate],
//           { account: requester.account }
//         )
//       ).to.be.rejectedWith("NotOwner");
//     });

//     it("Should fail with invalid requester address", async function () {
//       const { consentManager, user, publicClient } = await deployConsentManagerFixture();
      
//       const currentBlock = await publicClient.getBlock();
//       const startDate = currentBlock.timestamp + 100n;
//       const endDate = currentBlock.timestamp + 86400n;

//       await expect(
//         consentManager.write.createConsent(
//           ["0x0000000000000000000000000000000000000000", user.account.address, startDate, endDate],
//           { account: user.account }
//         )
//       ).to.be.rejectedWith("Invalid requesterDID");
//     });

//     it("Should fail if start date is after end date", async function () {
//       const { consentManager, user, requester, publicClient } = await deployConsentManagerFixture();
      
//       const currentBlock = await publicClient.getBlock();
//       const startDate = currentBlock.timestamp + 100n;
//       const endDate = currentBlock.timestamp + 86400n;

//       await expect(
//         consentManager.write.createConsent(
//           [requester.account.address, user.account.address, endDate, startDate], // swapped
//           { account: user.account }
//         )
//       ).to.be.rejectedWith("Start date must be before end date");
//     });

//     it("Should allow creating multiple consents for different requesters", async function () {
//       const { consentManager, user, requester, otherAccount, publicClient } = await deployConsentManagerFixture();
      
//       const currentBlock = await publicClient.getBlock();
//       const startDate = currentBlock.timestamp + 100n;
//       const endDate = currentBlock.timestamp + 86400n;

//       const hash1 = await consentManager.write.createConsent(
//         [requester.account.address, user.account.address, startDate, endDate],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: hash1 });

//       const hash2 = await consentManager.write.createConsent(
//         [otherAccount.account.address, user.account.address, startDate, endDate],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: hash2 });

//       const consentID1 = keccak256(
//         encodeAbiParameters(
//           [{ type: 'address' }, { type: 'address' }],
//           [requester.account.address, user.account.address]
//         )
//       );
//       const consentID2 = keccak256(
//         encodeAbiParameters(
//           [{ type: 'address' }, { type: 'address' }],
//           [otherAccount.account.address, user.account.address]
//         )
//       );

//       const consent1 = await consentManager.read.consents([user.account.address, consentID1]);
//       const consent2 = await consentManager.read.consents([user.account.address, consentID2]);

//       expect(consent1[1].toLowerCase()).to.equal(requester.account.address.toLowerCase());
//       expect(consent2[1].toLowerCase()).to.equal(otherAccount.account.address.toLowerCase());
//     });
//   });

//   describe("changeStatus", function () {
//     it("Should grant consent successfully", async function () {
//       const { consentManager, user, requester, publicClient } = await deployConsentManagerFixture();
      
//       const currentBlock = await publicClient.getBlock();
//       const startDate = currentBlock.timestamp + 100n;
//       const endDate = currentBlock.timestamp + 86400n;

//       // Create consent first
//       const createHash = await consentManager.write.createConsent(
//         [requester.account.address, user.account.address, startDate, endDate],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: createHash });

//       const consentID = keccak256(
//         encodeAbiParameters(
//           [{ type: 'address' }, { type: 'address' }],
//           [requester.account.address, user.account.address]
//         )
//       );

//       // Grant consent
//       const statusHash = await consentManager.write.changeStatus(
//         [user.account.address, consentID, ConsentStatus.Granted],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: statusHash });

//       const consent = await consentManager.read.consents([user.account.address, consentID]);
//       expect(consent[2]).to.equal(ConsentStatus.Granted);
//     });

//     it("Should revoke consent successfully", async function () {
//       const { consentManager, user, requester, publicClient } = await deployConsentManagerFixture();
      
//       const currentBlock = await publicClient.getBlock();
//       const startDate = currentBlock.timestamp + 100n;
//       const endDate = currentBlock.timestamp + 86400n;

//       // Create consent
//       const createHash = await consentManager.write.createConsent(
//         [requester.account.address, user.account.address, startDate, endDate],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: createHash });

//       const consentID = keccak256(
//         encodeAbiParameters(
//           [{ type: 'address' }, { type: 'address' }],
//           [requester.account.address, user.account.address]
//         )
//       );

//       // Grant consent
//       const grantHash = await consentManager.write.changeStatus(
//         [user.account.address, consentID, ConsentStatus.Granted],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: grantHash });

//       // Revoke consent
//       const revokeHash = await consentManager.write.changeStatus(
//         [user.account.address, consentID, ConsentStatus.Revoked],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: revokeHash });

//       const consent = await consentManager.read.consents([user.account.address, consentID]);
//       expect(consent[2]).to.equal(ConsentStatus.Revoked);
//     });

//     it("Should fail if not called by the user (owner)", async function () {
//       const { consentManager, user, requester, publicClient } = await deployConsentManagerFixture();
      
//       const currentBlock = await publicClient.getBlock();
//       const startDate = currentBlock.timestamp + 100n;
//       const endDate = currentBlock.timestamp + 86400n;

//       // Create consent
//       const createHash = await consentManager.write.createConsent(
//         [requester.account.address, user.account.address, startDate, endDate],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: createHash });

//       const consentID = keccak256(
//         encodeAbiParameters(
//           [{ type: 'address' }, { type: 'address' }],
//           [requester.account.address, user.account.address]
//         )
//       );

//       await expect(
//         consentManager.write.changeStatus(
//           [user.account.address, consentID, ConsentStatus.Granted],
//           { account: requester.account }
//         )
//       ).to.be.rejectedWith("NotOwner");
//     });

//     it("Should fail with invalid consentID", async function () {
//       const { consentManager, user } = await deployConsentManagerFixture();

//       await expect(
//         consentManager.write.changeStatus(
//           [user.account.address, "0x0000000000000000000000000000000000000000000000000000000000000000", ConsentStatus.Granted],
//           { account: user.account }
//         )
//       ).to.be.rejectedWith("Invalid consentID");
//     });

//     it("Should fail if consent doesn't exist", async function () {
//       const { consentManager, user, otherAccount } = await deployConsentManagerFixture();

//       const fakeConsentID = keccak256(
//         encodeAbiParameters(
//           [{ type: 'address' }, { type: 'address' }],
//           [otherAccount.account.address, user.account.address]
//         )
//       );

//       await expect(
//         consentManager.write.changeStatus(
//           [user.account.address, fakeConsentID, ConsentStatus.Granted],
//           { account: user.account }
//         )
//       ).to.be.rejectedWith("InvalidConsent");
//     });
//   });

//   describe("isConsentGranted", function () {
//     it("Should return false when consent doesn't exist", async function () {
//       const { consentManager, user, requester } = await deployConsentManagerFixture();

//       const isGranted = await consentManager.read.isConsentGranted([user.account.address, requester.account.address]);
//       expect(isGranted).to.be.false;
//     });

//     it("Should return false when consent is only requested", async function () {
//       const { consentManager, user, requester, publicClient } = await deployConsentManagerFixture();
      
//       const currentBlock = await publicClient.getBlock();
//       const startDate = currentBlock.timestamp + 100n;
//       const endDate = currentBlock.timestamp + 86400n;

//       const hash = await consentManager.write.createConsent(
//         [requester.account.address, user.account.address, startDate, endDate],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash });

//       const isGranted = await consentManager.read.isConsentGranted([user.account.address, requester.account.address]);
//       expect(isGranted).to.be.false;
//     });

//     it("Should return true when consent is granted", async function () {
//       const { consentManager, user, requester, publicClient } = await deployConsentManagerFixture();
      
//       const currentBlock = await publicClient.getBlock();
//       const startDate = currentBlock.timestamp + 100n;
//       const endDate = currentBlock.timestamp + 86400n;

//       // Create consent
//       const createHash = await consentManager.write.createConsent(
//         [requester.account.address, user.account.address, startDate, endDate],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: createHash });

//       const consentID = keccak256(
//         encodeAbiParameters(
//           [{ type: 'address' }, { type: 'address' }],
//           [requester.account.address, user.account.address]
//         )
//       );

//       // Grant consent
//       const grantHash = await consentManager.write.changeStatus(
//         [user.account.address, consentID, ConsentStatus.Granted],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: grantHash });

//       const isGranted = await consentManager.read.isConsentGranted([user.account.address, requester.account.address]);
//       expect(isGranted).to.be.true;
//     });

//     it("Should return false when consent is revoked", async function () {
//       const { consentManager, user, requester, publicClient } = await deployConsentManagerFixture();
      
//       const currentBlock = await publicClient.getBlock();
//       const startDate = currentBlock.timestamp + 100n;
//       const endDate = currentBlock.timestamp + 86400n;

//       // Create consent
//       const createHash = await consentManager.write.createConsent(
//         [requester.account.address, user.account.address, startDate, endDate],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: createHash });

//       const consentID = keccak256(
//         encodeAbiParameters(
//           [{ type: 'address' }, { type: 'address' }],
//           [requester.account.address, user.account.address]
//         )
//       );

//       // Grant consent
//       const grantHash = await consentManager.write.changeStatus(
//         [user.account.address, consentID, ConsentStatus.Granted],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: grantHash });

//       // Revoke consent
//       const revokeHash = await consentManager.write.changeStatus(
//         [user.account.address, consentID, ConsentStatus.Revoked],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: revokeHash });

//       const isGranted = await consentManager.read.isConsentGranted([user.account.address, requester.account.address]);
//       expect(isGranted).to.be.false;
//     });

//     it("Should fail with invalid userDID", async function () {
//       const { consentManager, requester } = await deployConsentManagerFixture();

//       await expect(
//         consentManager.read.isConsentGranted(["0x0000000000000000000000000000000000000000", requester.account.address])
//       ).to.be.rejectedWith("Invalid userDID");
//     });

//     it("Should fail with invalid requesterDID", async function () {
//       const { consentManager, user } = await deployConsentManagerFixture();

//       await expect(
//         consentManager.read.isConsentGranted([user.account.address, "0x0000000000000000000000000000000000000000"])
//       ).to.be.rejectedWith("Invalid requesterDID");
//     });
//   });

//   describe("Full Consent Workflow", function () {
//     it("Should complete a full consent workflow", async function () {
//       const { consentManager, user, requester, publicClient } = await deployConsentManagerFixture();
      
//       const currentBlock = await publicClient.getBlock();
//       const startDate = currentBlock.timestamp + 100n;
//       const endDate = currentBlock.timestamp + 86400n;

//       // Step 1: User creates consent request
//       const createHash = await consentManager.write.createConsent(
//         [requester.account.address, user.account.address, startDate, endDate],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: createHash });

//       // Step 2: Verify consent is in 'Requested' state
//       let isGranted = await consentManager.read.isConsentGranted([user.account.address, requester.account.address]);
//       expect(isGranted).to.be.false;

//       // Step 3: User grants consent
//       const consentID = keccak256(
//         encodeAbiParameters(
//           [{ type: 'address' }, { type: 'address' }],
//           [requester.account.address, user.account.address]
//         )
//       );
//       const grantHash = await consentManager.write.changeStatus(
//         [user.account.address, consentID, ConsentStatus.Granted],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: grantHash });

//       // Step 4: Verify consent is granted
//       isGranted = await consentManager.read.isConsentGranted([user.account.address, requester.account.address]);
//       expect(isGranted).to.be.true;

//       // Step 5: User revokes consent
//       const revokeHash = await consentManager.write.changeStatus(
//         [user.account.address, consentID, ConsentStatus.Revoked],
//         { account: user.account }
//       );
//       await publicClient.waitForTransactionReceipt({ hash: revokeHash });

//       // Step 6: Verify consent is no longer granted
//       isGranted = await consentManager.read.isConsentGranted([user.account.address, requester.account.address]);
//       expect(isGranted).to.be.false;
//     });
//   });
// });

