# Distributions

Distributions offer insightful lenses through which we can interpret the world. Commonly, we assume many phenomena follow a normal distribution. Take IQ scores, for instance. Most individuals score between 85 and 115, with the numbers dwindling as you move further from this average range.

![IQ distribution](/iq-distribution.png)

While it might not always be immediately clear, certain variables don't follow a typical distribution, like the Pareto distribution, for instance. The Pareto principle emphasizes that approximately 80% of effects arise from just 20% of the causes, often referred to as the "vital few". For example, the wealthiest 20% possess 80% of the total wealth.

>  The **Pareto principle** states that for many outcomes, roughly 80% of consequences come from 20% of causes (the “vital few”). Other names for this principle are the **80/20 rule**, the **law of the vital few,** or the **principle of factor sparsity.**

Pareto principle can be applied at a wide range of areas such **as manufacturing, management, and human resources**. It’s similar to *[Price’s law](https://dariusforoux.com/prices-law/)* which states: *“50% of the work is done by the square root of the total number of people who participate in the work.”*

In practical terms, within a company of 10,000 employees, merely 100 might be responsible for half of the output. Imagine assigning probabilities to various qualities: x1 for diligence, x2 for above-average productivity, x3 for extensive connections, and so on. To find someone who embodies all these traits, we'd multiply these probabilities (x1 x x2 x x3 ...). The resulting figure is typically minuscule, elucidating why such high-achieving individuals are so rare in larger groups.

>  “As your company grows, incompetence grows exponentially and competence grows linearly.”

# Pareto distribution

$$
f_X(x) = 
\begin{cases} 
\frac{\alpha x_m^{\alpha}}{x^{\alpha+1}} & \text{if } x \geq x_m,\\\\
0 & \text{if } x < x_m.
\end{cases}
$$


I'll be delving deeper into the Pareto distribution due to its widespread applicability. Let's kick things off with a bit of math.
The function relies on a singular parameter, α, and a variable, x. As depicted in the graph, xm is set at 1 with varying values of α. Here, α signifies the probability when x equals xm. It's evident that as x increases, the probability diminishes at an exponential rate.
This distribution is versatile, permeating various sectors marked by disparities in creative contributions. For instance, the Pareto principle explains the distribution of successful NBA players, record sales, urban population sizes, book sales, goals in football, the size variation of trees in forests, and even how a handful of composers dominate classical music compositions.

![Pareto distribution (xm=1)](https://cdn-images-1.medium.com/max/3840/0*xL6ME7LZT9-eEhos.png)

To gain a clearer perspective on the Pareto distribution, let's consider a hypothetical trading game simulation. In this scenario, 5,000 participants each start with an equal sum of $1,000. As the simulation progresses, money is continually transferred between randomly chosen participants. If a participant lacks sufficient funds for a transaction, it's bypassed, and the simulation proceeds with another pair of participants.

![Simulation](https://cdn-images-1.medium.com/max/2000/1*gmqqL9KKN-mTS3voGmotIQ.gif)

As the simulation progresses, some participants begin to amass more funds while others start depleting their reserves. Success begets success; those on a winning streak are more likely to continue their upward trajectory. Conversely, those losing money face an increasing risk of further losses. The number 0 stands out starkly in this scenario. Reaching a balance of $0 signifies elimination from the game. As the game evolves, an increasing number of participants find themselves with empty pockets. By the simulation's conclusion, a striking outcome emerges: one individual possesses all the wealth, leaving 4,999 participants with nothing. This scenario highlights the challenges of escaping a poverty cycle. When finances dwindle, the climb out becomes increasingly steep. On the flip side, the affluent, with their growing wealth, have a higher likelihood of maintaining and amplifying their fortunes.
In essence, as participants gravitate towards a $0 balance, they enter a reinforcing cycle, making it increasingly probable they'll bottom out. Similarly, those moving away from this precarious point find themselves in a positive spiral, pushing them further from financial ruin.

# Seeking Solutions to the Disparity

A stark concentration of resources among a limited elite, while the majority languish with little, poses grave societal risks. Historical attempts to rectify this imbalance—by redistributing resources from the few to the many—have often seen resources eventually reconcentrate at the top. The dilemma presented by the Pareto distribution remains unresolved. Efforts to counteract it can lead to catastrophic consequences.

For instance, post-World War I Russia paints a grim picture. The country was reeling, with villages filled with traumatized individuals suffering from the aftermath of war. Amidst this backdrop, a minority of *[kulaks](https://en.wikipedia.org/wiki/Kulak)* - prosperous peasants - controlled a significant share of the land, producing the bulk of food for Russia and Ukraine. They became a target. [Vladimir Lenin](https://en.wikipedia.org/wiki/Vladimir_Lenin) described them as *“bloodsuckers, vampires, plunderers of the people and profiteers, who fatten on famine,”*. In an effort to redistribute wealth, intellectuals were dispatched to villages to implement farm collectivization. This led to mob actions, with kulaks facing violent deaths, assaults, or being exiled to the harsh Siberian winters. Many perished. The aftermath of these actions was devastating: millions died of starvation in the subsequent years.

# Summary

Be it humans vying for monetary assets or avian species foraging for food, unequal distribution seems a consistent pattern. What's astonishing is the recurring theme where roughly 20% dominate nearly 80% of the resources or results. This suggests that the Pareto principle might be an intrinsic mechanism governing competitive environments.