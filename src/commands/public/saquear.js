import { handleSaquear } from "../../utils/carroForte.js";

export default {
  name: "saquear",
  aliases: ["sacar"],
  description: "Tenta saquear o carro-forte que apareceu no grupo",
  category: "fun",

  async run({ sock, msg }) {
    await handleSaquear({ sock, msg });
  }
}
