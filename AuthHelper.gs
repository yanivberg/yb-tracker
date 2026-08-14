function testPOImportManually() {
  DocumentApp.create('x').getId(); // force auth
  Logger.log('=== Manual PO Import Test ===');
  checkForPurchaseOrderEmails();
  Logger.log('=== Done ===');
}