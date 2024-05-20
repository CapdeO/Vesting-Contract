# Vesting Contract

## Vesting


## Vesting 2
Este contrato envía los pagos de las inversiones a diferentes direcciones dependiendo de la stablecoin utilizada. Las direcciones se guardan en las variables receiverUSDT, receiverUSDC y receiverBUSD, que son seteadas en el constructor. Una actualización de este contrato podría incluir un método para modificar alguna de estas direcciones si es necesario.

## Vesting Affiliate
Extensión de Vesting 2 en donde cualquiera puede establecer su ćodigo de referido y compartirlo con otras personas para que inviertan utilizándolo, y así obtener un porcentaje de comisión de esa inversión.
- El máximo de veces en las que se obtiene comisión por inversor es TRES.
- El porcentaje que se obtiene de la primera inversión de un inversor afiliado es TRES (3%).
- El porcentaje que se obtiene de la segunda inversión de un inversor afiliado es CINCO (5%).
- El porcentaje que se obtiene de la tercer inversión de un inversor afiliado es SIETE (7%).
- El total y máximo de porcentaje que se obtiene de esas TRES inversiones es QUINCE (15%).
- La comisión se toma del capital invertido en la compra (stablecoin), y no de los tokens. Por lo tanto el inversor afiliado se lleva el 100% de tokens correspondientes su inversión.

También existe la posibilidad de invertir ofreciendo un porcentaje de donación para fines de ayuda humanitaria. El porcentaje de donación es a elección, y se suma a la cantidad total de inversión. Ejemplo: inversor quiere comprar $100 y donar un 30%. Total = $130.

La emisión de eventos del contrato asegura la transparencia y trazabilidad por medio de un registro inmutable, que puede ser consultado también para usos estadísticos.
- Todas las compras emiten el evento "BuyTokens", con el número de fase, dirección del inversor, capital invertido y tokens obtenidos.
- Si se utiliza un código de referido, se emite el evento "ReferralCodeUsed", con el código de referido, la dirección del inversor (afiliado), la cantidad de veces que ese afiliado utilizó el código y el capital correspondiente a la comisión destinada al influencer (dueño de ese código de referido).
- Si se realiza una donación, se emite el evento "Donation", con la dirección del donante y el monto.

## Vesting Team
