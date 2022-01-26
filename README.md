# awesome_app

Follow these instructions to use the project (tested on my machine, Ubuntu 18.04).

1. Get HyperLedger Fabric prerequisites: https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html
   
   These include docker, docker-compose, cURL and Git for Linux. You probably already have most, if not all of these.

2. Install the Fabric binaries and samples https://hyperledger-fabric.readthedocs.io/en/latest/install.html.
    
   This will add a fabric-samples folder to your machine in the directory you are installing. 
   The Fabric samples are a collection of Fabric sample projects. They can be found here:         https://github.com/hyperledger/fabric-samples

3. Make sure you have these Fabric Node SDK requirements: https://github.com/hyperledger/fabric-sdk-node#build-and-test. 

  * Node.js, version 10 is supported from 10.15.3 and higher
  * Node.js, version 12 is supported from 12.13.1 and higher
  
  I use node version 12.18.1
  Check node version with command:
  ```
  node -v
  ```
  
  * npm tool version 6 or higher
  
  I use node version 6.14.5
  Check node version with command:
  ```
  npm -v
  ```
  
  * docker - Should already be installed from step 2.

4. Clone this repository https://github.com/venoivankovic/awesome_app into the Fabric samples folder.

5. Change directory to the awesome directory you cloned into the Fabric samples folder:

   ```
   cd awesome
   ```
6. Change into the apiserver directory:

   ```
   cd apiserver
   ```
   
7. From here you install the node dependencies, run command:

   ```
   npm install
   ```
   Repeat this with awesome_webapp directory:
   
   ```
   cd awesome_webapp
   ```
   
   ```
   npm install
   ```
   You will only need to install node modules once.
   
8. Run script startFabric.sh from top level awesome_app directory:

   ```
   ./startFabric.sh
   ```
   
Auction Demo:
    
    To illustrate the web app let's examine a possible scenario. 
    First, a provider submits an auction.
    
    ![1auction](https://user-images.githubusercontent.com/35835812/138025561-6b23b276-a226-4b55-a752-1631f5f8cec6.png)
    
    The provider can see the auction they submitted in their my auctions page.
    
    ![2auction](https://user-images.githubusercontent.com/35835812/138027992-6e644bc8-2e53-4e76-96ed-4d525845d709.png)

   They can click on the auction and inspect it more closely.
   
   ![3auction](https://user-images.githubusercontent.com/35835812/138028045-e93dd8e7-4796-474d-8ae5-495aec54a13d.png)

   A bidding customer "bidder1" sees the auction in their browse auctions page.
    ![4auction](https://user-images.githubusercontent.com/35835812/138028872-20b8dbac-c9d4-496d-9e2d-14da07379014.png)

   They submit a bid of 90€.
    
![5auction](https://user-images.githubusercontent.com/35835812/138028916-024225da-2290-47ec-9626-f9f7c7f28160.png)

   Another customer called "customer2" submits a bid and "bidder1" and "customer2" enter a bidding war for the service. The provider can see this and decides that the highest bid of 120€ is good, so they end the auction.
        
![7auction](https://user-images.githubusercontent.com/35835812/138028943-f75ca5de-6493-493b-a5d3-70d16a79bb05.png)

   Then the winning bidder and provider can see the generated SLA.
  
  ![10auction](https://user-images.githubusercontent.com/35835812/138028754-8d929d47-c2d0-478a-b0f3-55d0832050fb.png)
   
