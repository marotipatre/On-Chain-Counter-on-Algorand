from algopy import *
from algopy.arc4 import abimethod


class Counter(ARC4Contract):

    count: UInt64

    def __init__(self) -> None:
        self.count = UInt64(0)

    @abimethod()
    def incr_counter(self)-> UInt64:
        self.count += UInt64(1)
        return self.count
    
    @abimethod(readonly=True)
    def get_counter(self) -> UInt64:
        return self.count
    
    @abimethod()
    def decr_counter(self)-> UInt64:
        self.count -= UInt64(1)
        return self.count
