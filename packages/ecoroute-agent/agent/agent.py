# ================================================================
# ecoroute-agent/agent/agent.py
#
# EcoRoute AI Assistant — ReAct Agent
# ================================================================

import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.agents import AgentType, initialize_agent
from .tools import find_greenest_route, compare_vehicle_emissions, get_eco_tips

load_dotenv()

class EcoRouteAssistant:
    def __init__(self, model: str = "gpt-4-turbo-preview"):
        self.llm = ChatOpenAI(temperature=0, model=model)
        self.tools = [
            find_greenest_route,
            compare_vehicle_emissions,
            get_eco_tips
        ]
        self.agent = initialize_agent(
            self.tools,
            self.llm,
            agent=AgentType.CHAT_CONVERSATIONAL_REACT_DESCRIPTION,
            verbose=True,
            handle_parsing_errors=True
        )

    async def chat(self, message: str, chat_history: list = []):
        """
        Main entry point for the AI assistant.
        """
        response = await self.agent.arun(
            input=message,
            chat_history=chat_history
        )
        return response

if __name__ == "__main__":
    import asyncio
    
    async def test():
        assistant = EcoRouteAssistant()
        print("EcoRoute Assistant ready. Type 'exit' to quit.")
        while True:
            user_input = input("You: ")
            if user_input.lower() == "exit":
                break
            response = await assistant.chat(user_input)
            print(f"Assistant: {response}")

    asyncio.run(test())
