# Pareto Distribution, Price’s law and the Distribution of Wealth

## Distributions

One of the great ways to understand the world is to use distributions. We tend to think that everything has a [normal distribution](https://en.wikipedia.org/wiki/Normal_distribution). IQ for example is normally distributed, that means the majority of people are between 85 and 115 IQ while it gets fewer and fewer when moving away from the median.

![IQ distribution](https://imgur.com/wkztMXW.png)

But this is not always the case. The [distribution of wealth](https://en.wikipedia.org/wiki/Distribution_of_wealth) is a [Pareto distribution](https://en.wikipedia.org/wiki/Pareto_distribution), which is very different from the normal distribution. We always hear that 20% of the richest have 80% of the total wealth or 20% of clients make up 80% of the income, that’s the [Pareto principle](https://en.wikipedia.org/wiki/Pareto_principle).

>  The **Pareto principle** states that for many outcomes, roughly 80% of consequences come from 20% of causes (the “vital few”). Other names for this principle are the **80/20 rule**, the **law of the vital few,** or the **principle of factor sparsity.**

Pareto principle can be applied at a wide range of areas such **as manufacturing, management, and human resources**. It’s similar to [Price’s law](https://dariusforoux.com/prices-law/) which states: *“50% of the work is done by the square root of the total number of people who participate in the work.”*

That means in a 10000 employees company, 100 will do 50% of the work.
Let’s say there is a probability x1 that an individual is diligent, probability x2 that he is more productive than the average person, probability x3 that he has more connections etc… To get such individual we have to multiply the probabilities (x1 * x2 * x3 …) to end up with a very small probability. This explains the rarity of hard-working individuals who do most of the work.

>  “As your company grows, incompetence grows exponentially and competence grows linearly.”

## Pareto distribution


![Pareto probability density function](https://cdn-images-1.medium.com/max/2828/1*hzd-vL6YohNhE2LE-y_g5Q.png)

I will be focusing more on the Pareto distribution since it’s more universal. Let’s start with some Maths first.
The function have 1 parameter α and 1 variable x. In the graph, we have xm = 1 and different α values. α represents the probability when x = xm.
Notice that the probability decreases exponentially when x grows.
The Pareto distribution can be applied in every single realm where there is difference in creative production. The number of successful basketball players to make it to the NBA is Pareto distributed. same goes for number of record sold, size of cities, books sold, goals scored, trees size in the jungle, 5 composers produce 50% of of classical repertoire etc…

![Pareto distribution (xm=1)](https://cdn-images-1.medium.com/max/3840/0*xL6ME7LZT9-eEhos.png)

To better understand the Pareto distribution, we will take a look at a simulation of a trading game. Initially, 5000 agents are given the same amount of money (1000$). After simulation starts, certain amounts of money are repeatedly transferred from one randomly selected agent to another. If the selected agent does not have enough money to pay, the transaction does not take place, and simulation continues with another pair of agents.


![](https://cdn-images-1.medium.com/max/2000/1*gmqqL9KKN-mTS3voGmotIQ.gif)

As time goes by, some people start to win a bit while others will start to lose a bit. And then if you win, the probability that you will keep on winning starts to increase, and if you lose, your vulnerability increases as you lose. 0 is a very weird number, because falling to 0 means you are out of the game. What happens is that the number of agents with 0$ (α) increases rapidly. If we run this simulation to the end. There will be 1 person with all the money and 4999 person with 0$. If you are so broke that you can’t keep up with paying your bills, it’s very difficult to get out of poverty trap. Meanwhile, the richest are very probable to stay in the game, thus get richer and richer.
As people move towards 0, a positive feedback loop gets set up so they are more likely to hit 0. And as they move away from 0, positive feedback loop gets setup so they are more likely to move away from 0.

## Solutions

Having a lot of resources funneled to a small minority at the top while the majority stacks at 0 is a very menacing danger to a society. People tried to solve this problem with shuffling resources from the minority to the majority but it always end up back to the top. There is currently no solution to answer the Pareto distribution in a consistent way. In fact, Trying to solve this problem can cause major problems. In 1920, after world war I. Russia is in very bad shape, the villages are full of brutalized men with post-traumatic stress disorder and people who are not doing well. While there’s a minority of [kulaks](https://en.wikipedia.org/wiki/Kulak) (peasants) that were very successful and had a large proportion of the land and produced almost all of the food for Russia and Ukraine. [Vladimir Lenin](https://en.wikipedia.org/wiki/Vladimir_Lenin) described them as “bloodsuckers, vampires, plunderers of the people and profiteers, who fatten on famine,” and sent intellectuals to the villages to collectivize the farms. Mobs were formed and the kulaks were killed, raped or set off to Siberia in the winter. They all died, and the consequences were a few years later, 6 million people starved to death.

## Conclusion

Whether it is people competing for financial resources or birds competing for natural resources, an unequal, skewed distribution is inevitable. What is so surprising is how often the top 20% of the species, or causes, is responsible for very close to 80% of the population, or outcomes. It appears that the Pareto principle may be a fundamental law of competition.
