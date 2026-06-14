const fs = require('fs');
const path = require('path');

const inputPath = 'C:\\Users\\Daniel\\.gemini\\antigravity-ide\\brain\\b9369fa8-e249-4243-8422-fba00cab6ec2\\.system_generated\\steps\\1916\\output.txt';
const content = fs.readFileSync(inputPath, 'utf8');

// Parse the n8n response
const n8nData = JSON.parse(content);
const workflow = n8nData.data;

// Find the AbacatePay node
const node = workflow.nodes.find(n => n.name === "AbacatePay - Criar Cobrança");

if (node) {
  // Update the jsonBody property with valid {{ JSON.stringify(...) }} syntax
  node.parameters.jsonBody = `={{ JSON.stringify({
  frequency: "ONE_TIME",
  methods: ["PIX"],
  products: [
    {
      externalId: "cart",
      name: "Pedido LanchoNet",
      quantity: 1,
      price: Math.round($('Webhook Checkout').first().json.body.total * 100)
    }
  ],
  returnUrl: "https://lanchonet.com/sucesso",
  completionUrl: "https://lanchonet.com/sucesso",
  metadata: {
    lojista_id: $('Webhook Checkout').first().json.body.lojista_id,
    whatsapp_instance: $json.whatsapp_instance,
    cliente: $('Webhook Checkout').first().json.body.cliente,
    itens: $('Webhook Checkout').first().json.body.itens
  }
}) }}`;
  
  // Write the updated workflow JSON to a temporary file
  fs.writeFileSync('C:\\tmp\\updated-workflow.json', JSON.stringify(workflow, null, 2));
  console.log('Workflow successfully modified and saved to C:\\tmp\\updated-workflow.json');
} else {
  console.log('Node not found!');
}
