---
tags:   temporal.io ai-coding cursor.ai
---
I'm regularly testing out AI coding tools since I want to improve my workflow and be more productive - ok, maybe that's just code for not getting left behind by AIs fast-paced ~~PR~~ product improvements

I learned that context is king when using AI agents. Everything that the agent should be aware of but wasn't originally trained on needs to be in this "working memory" and for coding tasks this can be a lot: the training data did not contain your private codebase or the most recent updates to libraries and documentation. This fact paired with an agent's extraordinary skill for making things up that sound correct is a core annoyance of current coding AIs. And a time sink that often eats up a lot of the productivity gain.

But context is limited. [200k tokens for current models](https://codingscape.com/blog/llms-with-largest-context-windows) that are easily (and "cheaply") accessible to the public. This is especially limiting for coding tasks, where [context is everything](https://magic.dev/blog/100m-token-context-windows). So, if you want a well-performing agent make sure the context is filled just right. No distractions - just the most relevant information. And your tasks.

With this in mind I started the perfect project: exploring Temporal's [Entity Workflows](https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://temporal.io/blog/very-long-running-workflows&ved=2ahUKEwjPhcKku6mOAxXPIjQIHWoEIu8QFnoECB4QAQ&usg=AOvVaw2Vb56Vz7ePOToThpVxv8SC) concept by creating a small PoC. Why perfect? It's a new, self-contained project - there's no existing codebase to understand. Moreover, Temporal has a great [samples repository](https://github.com/temporalio/samples-go) with many high quality examples.

So I set up my [Cursor](https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://cursor.com/&ved=2ahUKEwinzIiSvamOAxW6IjQIHRI1J3sQFnoECBAQAQ&usg=AOvVaw3-ELonbvoeRhBLJ55PamI_) workspace to include the Temporal samples and the [SDK repo](https://github.com/temporalio/sdk-go/tree/master). Then I got to work.

```
workspace
├── samples-go
└── sdk-go
```
This worked exceptionally well and within a few minutes I had a long-running workflow that could receive work items via Updates, validate & enqueue them, and then process those items asynchronously. This saved me at least 1-2 hours of trying to get the pieces in place myself. But while exploring the workflow's behavior I noticed a concurrency issue: Sometimes Updates wouldn't enqueue the new work item but instead wait for all the work to be done.

Naturally, since that's the whole point of this experiment, I asked Cursor to help me debug—and it sort of did. It came up with a few different scenarios that could be the culprit. Some clearly didn’t hold up once I familiarized myself with the Temporal docs. Others seemed useful but turned out to be wrong. At this point I spent another 60 minutes basically chasing ghosts by overestimating Cursor's capabilities.

Frustrated and confused, I went with plan B: walk a colleague through my troubles. I brought him up-to-speed (aka: I filled his context) and he threw a few ideas around. It took some iterations until we both got on the same page of what I'm trying to do. Then it hit us. The code is using a synchronous API method while there's [an async one available as well](https://github.com/temporalio/sdk-go/blob/8ee3a8a3ca4066db0735c84b4fc43298b36b5e78/internal/workflow.go#L117-L120)! After switching over the behavior is as expected.

What did I learn from this anecdote?
- thoughtful context modeling is valuable
- LLMs seem to prefer generic debugging strategies over those tailored to a domain or library
- by _not_ writing it myself, I needed to catch up my understanding when I hit the bug - and lose most of the time I saved
  - even worse: the IDEs `gopls` integration would have immediately pointed out the two versions if I had written it myself

So, was it useful? Yes. But mostly because _it got me going_ with a task I would have otherwise procrastinated on. Once I had something going, motivation kicked into high gear and I solved it.
